-- App Flagra Capture: de onde a foto veio e em que tamanho subiu.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
alter table public.photos add column if not exists source text not null default 'site';      -- 'site' ou 'app'
alter table public.photos add column if not exists upload_size text;                         -- 'rapido' (3000 px), 'original' ou vazio
