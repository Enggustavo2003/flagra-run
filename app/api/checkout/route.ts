import { NextResponse } from "next/server";
import { isUuid } from "@/lib/format";
import { cleanCpf, createPixPayment, paymentsFake } from "@/lib/payments";
import { cleanPhone } from "@/lib/phone";
import { computeTotals, pixFeeCents, splitPixFee, splitTotal } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids: unknown = body?.photoIds;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every(isUuid)) {
    return NextResponse.json({ error: "Carrinho inválido." }, { status: 400 });
  }
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Preencha o nome e um e-mail válido." }, { status: 400 });
  }
  const phone = cleanPhone(typeof body?.phone === "string" ? body.phone : "");
  if (!phone) {
    return NextResponse.json({ error: "Digite um WhatsApp válido, com DDD." }, { status: 400 });
  }
  // O Asaas exige o CPF de quem paga. Não guardamos no nosso banco.
  const cpf = cleanCpf(typeof body?.cpf === "string" ? body.cpf : "");
  if (!paymentsFake() && !cpf) {
    return NextResponse.json({ error: "Digite um CPF válido. Ele é exigido para gerar o Pix." }, { status: 400 });
  }
  const photoIds = [...new Set(ids as string[])];

  const db = supabaseAdmin();
  const { data: photos, error } = await db
    .from("photos")
    .select("id, event_id, events!inner(price_cents, published, photographer_id, name)")
    .in("id", photoIds)
    .eq("hidden", false);
  if (error) return NextResponse.json({ error: "Erro ao carregar as fotos." }, { status: 500 });

  const rows = (photos ?? []).filter((p: any) => p.events.published) as any[];
  if (rows.length !== photoIds.length) {
    return NextResponse.json(
      { error: "Algumas fotos do carrinho não estão mais à venda. Remova-as e tente de novo." },
      { status: 409 }
    );
  }

  // O preço sempre vem do banco, nunca do navegador
  const prices = rows.map((p) => p.events.price_cents as number);
  const t = computeTotals(prices);
  const shares = splitTotal(prices, t.total);

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      buyer_name: name,
      buyer_email: email,
      buyer_phone: phone,
      marketing_optin: body?.optin === true,
      subtotal_cents: t.subtotal,
      discount_cents: t.discount,
      total_cents: t.total,
    })
    .select("id, access_token")
    .single();
  if (oErr || !order) return NextResponse.json({ error: "Erro ao criar o pedido." }, { status: 500 });

  const { data: pgs } = await db
    .from("photographers")
    .select("id, fee_pct")
    .in("id", [...new Set(rows.map((p) => p.events.photographer_id as string))]);
  const feeOf = new Map((pgs ?? []).map((p: any) => [p.id, Number(p.fee_pct)]));

  // A taxa do Pix do pedido é dividida entre os itens (e, por isso, entre os fotógrafos), proporcional ao valor.
  const feePcts = rows.map((p) => feeOf.get(p.events.photographer_id) ?? 12);
  const pixFees = splitPixFee(shares, feePcts, pixFeeCents());

  const { error: iErr } = await db.from("order_items").insert(
    rows.map((p, i) => ({
      order_id: order.id,
      photo_id: p.id,
      event_id: p.event_id,
      photographer_id: p.events.photographer_id,
      price_cents: shares[i],
      fee_pct: feePcts[i],
      pix_fee_cents: pixFees[i],
    }))
  );
  if (iErr) {
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Erro ao criar o pedido." }, { status: 500 });
  }

  const url = `/pedido/${order.id}?t=${order.access_token}`;

  if (paymentsFake()) {
    await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
    return NextResponse.json({ url });
  }

  try {
    const pix = await createPixPayment({
      orderId: order.id,
      totalCents: t.total,
      email,
      name,
      cpf: cpf!,
      phone,
      photoCount: rows.length,
    });
    await db
      .from("orders")
      .update({ gateway_order_id: pix.gatewayOrderId, pix_qr_code: pix.qrCode, pix_qr_base64: pix.qrBase64 })
      .eq("id", order.id);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Asaas:", err);
    await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json(
      { error: "Não foi possível gerar o Pix agora. Tente de novo em alguns minutos." },
      { status: 502 }
    );
  }
}
