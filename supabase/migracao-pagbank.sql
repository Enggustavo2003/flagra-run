-- Troca do Mercado Pago pelo PagBank.
-- Rode UMA vez no Supabase > SQL Editor se você já tinha rodado o schema.sql antigo.
-- (Quem está instalando do zero não precisa: o schema.sql já vem atualizado.)

alter table public.orders rename column mp_payment_id to gateway_order_id;
create index if not exists orders_gateway_order_idx on public.orders (gateway_order_id);
