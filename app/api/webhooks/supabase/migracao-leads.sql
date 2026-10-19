-- WhatsApp dos clientes, autorização de mensagens, avisos de fotos e perfil do fotógrafo.
-- Rode UMA vez no Supabase > SQL Editor ANTES de subir o código novo.

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
