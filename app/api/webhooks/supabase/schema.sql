-- Flagra Run: banco de dados
-- Rode este arquivo inteiro uma vez no Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- Fotógrafos (um por usuário logado)
create table if not exists public.photographers (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

-- Eventos / álbuns
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers on delete cascade,
  slug text unique not null,
  name text not null,
  city text not null default '',
  event_date date not null,
  category text not null default 'Corrida',
  price_cents int not null check (price_cents > 0),
  published boolean not null default false,
  cover_path text,
  photo_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists events_published_date_idx on public.events (published, event_date desc);

-- Fotos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  original_path text not null,
  preview_path text not null,
  width int,
  height int,
  bibs int[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists photos_event_idx on public.photos (event_id, created_at);
create index if not exists photos_bibs_idx on public.photos using gin (bibs);

-- Pedidos (só o servidor lê e escreve)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  access_token text not null default encode(gen_random_bytes(24), 'hex'),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  subtotal_cents int not null,
  discount_cents int not null default 0,
  total_cents int not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  gateway_order_id text,
  pix_qr_code text,
  pix_qr_base64 text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists orders_gateway_order_idx on public.orders (gateway_order_id);

create table if not exists public.order_items (
  order_id uuid not null references public.orders on delete cascade,
  photo_id uuid not null references public.photos on delete restrict,
  event_id uuid not null references public.events on delete restrict,
  photographer_id uuid not null references public.photographers on delete restrict,
  price_cents int not null,
  primary key (order_id, photo_id)
);
create index if not exists order_items_photographer_idx on public.order_items (photographer_id);

-- ---------- Segurança (RLS) ----------
alter table public.photographers enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "fotografo le o proprio perfil" on public.photographers;
create policy "fotografo le o proprio perfil" on public.photographers
  for select using (id = auth.uid());
drop policy if exists "fotografo cria o proprio perfil" on public.photographers;
create policy "fotografo cria o proprio perfil" on public.photographers
  for insert with check (id = auth.uid());
drop policy if exists "fotografo edita o proprio perfil" on public.photographers;
create policy "fotografo edita o proprio perfil" on public.photographers
  for update using (id = auth.uid());

drop policy if exists "eventos publicados ou do dono" on public.events;
create policy "eventos publicados ou do dono" on public.events
  for select using (published or photographer_id = auth.uid());
drop policy if exists "dono cria evento" on public.events;
create policy "dono cria evento" on public.events
  for insert with check (photographer_id = auth.uid());
drop policy if exists "dono edita evento" on public.events;
create policy "dono edita evento" on public.events
  for update using (photographer_id = auth.uid());
drop policy if exists "dono apaga evento" on public.events;
create policy "dono apaga evento" on public.events
  for delete using (photographer_id = auth.uid());

drop policy if exists "fotos de evento publicado ou do dono" on public.photos;
create policy "fotos de evento publicado ou do dono" on public.photos
  for select using (exists (
    select 1 from public.events e
    where e.id = event_id and (e.published or e.photographer_id = auth.uid())
  ));
drop policy if exists "dono edita fotos" on public.photos;
create policy "dono edita fotos" on public.photos
  for update using (exists (
    select 1 from public.events e where e.id = event_id and e.photographer_id = auth.uid()
  ));
-- inserir e apagar fotos é feito só pelo servidor (service role)
-- orders e order_items não têm política: só o servidor acessa

-- ---------- Armazenamento ----------
-- previews: público (fotos com marca d'água)
-- originals: privado (fotos limpas, só saem por link assinado após o pagamento)
insert into storage.buckets (id, name, public)
values ('previews', 'previews', true), ('originals', 'originals', false)
on conflict (id) do nothing;

drop policy if exists "fotografo envia originais na propria pasta" on storage.objects;
create policy "fotografo envia originais na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Busca por selfie ----------
alter table public.photos add column if not exists faces_indexed boolean not null default false;
create table if not exists public.photo_faces (
  face_id text primary key,
  photo_id uuid not null references public.photos on delete cascade
);
create index if not exists photo_faces_photo_idx on public.photo_faces (photo_id);
alter table public.photo_faces enable row level security;
alter table public.photos add column if not exists hidden boolean not null default false;
drop policy if exists "fotos de evento publicado ou do dono" on public.photos;
create policy "fotos de evento publicado ou do dono" on public.photos
  for select using (exists (
    select 1 from public.events e
    where e.id = event_id and (e.photographer_id = auth.uid() or (e.published and not hidden))
  ));
create table if not exists public.face_removals (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  photo_ids uuid[] not null,
  created_at timestamptz not null default now()
);
alter table public.face_removals enable row level security;

-- ---------- Plano Fundador ----------
-- Os 30 primeiros fotógrafos ficam com 10% de comissão para sempre. Depois, 12%. Selfie incluída, sem mensalidade.
-- A comissão é definida pelo banco no cadastro e o próprio fotógrafo não consegue alterá-la.
alter table public.photographers add column if not exists fee_pct numeric(5,2) not null default 12;
alter table public.photographers add column if not exists founder boolean not null default false;
alter table public.order_items add column if not exists fee_pct numeric(5,2);

create or replace function public.photographer_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.photographers where founder) < 30 then
      new.founder := true; new.fee_pct := 10;
    else
      new.founder := false; new.fee_pct := 12;
    end if;
  elsif auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    new.founder := old.founder; new.fee_pct := old.fee_pct;
  end if;
  return new;
end $$;

drop trigger if exists photographers_plan on public.photographers;
create trigger photographers_plan before insert or update on public.photographers
  for each row execute function public.photographer_plan();

-- Compras: WhatsApp e autorização para receber novidades
alter table public.orders add column if not exists buyer_phone text;
alter table public.orders add column if not exists marketing_optin boolean not null default false;
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (buyer_phone);

-- "Me avise quando minhas fotos chegarem"
create table if not exists public.photo_alerts (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null,
  bib int not null,
  marketing_optin boolean not null default false,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create unique index if not exists photo_alerts_phone_bib on public.photo_alerts (phone, bib);
alter table public.photo_alerts enable row level security; -- só o servidor acessa

-- Perfil do fotógrafo
alter table public.photographers add column if not exists whatsapp text;
alter table public.photographers add column if not exists instagram text;
alter table public.photographers add column if not exists modalities text[] not null default '{}';
