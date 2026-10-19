-- Busca por selfie (reconhecimento facial).
-- Rode UMA vez no Supabase > SQL Editor.

alter table public.photos add column if not exists faces_indexed boolean not null default false;

-- Ligação entre cada rosto indexado no Amazon Rekognition e a foto onde ele aparece.
-- Guarda só o identificador do rosto (FaceId), não a imagem nem a biometria.
create table if not exists public.photo_faces (
  face_id text primary key,
  photo_id uuid not null references public.photos on delete cascade
);
create index if not exists photo_faces_photo_idx on public.photo_faces (photo_id);

-- Só o servidor acessa
alter table public.photo_faces enable row level security;

-- Fotos escondidas a pedido do próprio corredor (somem da busca e da venda)
alter table public.photos add column if not exists hidden boolean not null default false;

drop policy if exists "fotos de evento publicado ou do dono" on public.photos;
create policy "fotos de evento publicado ou do dono" on public.photos
  for select using (exists (
    select 1 from public.events e
    where e.id = event_id and (e.photographer_id = auth.uid() or (e.published and not hidden))
  ));

-- Registro dos pedidos de remoção (só o servidor acessa)
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

-- Quem já tinha cadastro antes do plano entra como fundador.
update public.photographers set founder = true, fee_pct = 10 where founder = false;

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
