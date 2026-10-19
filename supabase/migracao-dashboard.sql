-- Repasses pagos aos fotógrafos (painel /admin).
-- Rode UMA vez no Supabase > SQL Editor ANTES de subir o código novo.
create table if not exists public.photographer_payouts (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers on delete restrict,
  amount_cents int not null check (amount_cents > 0),
  note text not null default '',
  paid_at timestamptz not null default now()
);
create index if not exists photographer_payouts_pg_idx on public.photographer_payouts (photographer_id);
alter table public.photographer_payouts enable row level security; -- só o servidor acessa
