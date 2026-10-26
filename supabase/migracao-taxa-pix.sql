-- Taxa do Pix descontada do repasse dos fotógrafos.
-- Rode UMA vez no Supabase > SQL Editor ANTES de subir o código novo.
-- Cada item guarda a parte dele na taxa do Pix do pedido (em centavos). Pedidos antigos ficam com 0.
alter table public.order_items add column if not exists pix_fee_cents int not null default 0;
