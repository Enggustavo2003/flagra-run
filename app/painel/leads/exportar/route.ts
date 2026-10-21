import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAlerts, getCustomers, getPhotographers } from "@/lib/leads";
import { formatPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Planilha (CSV com ; para abrir direto no Excel em português). */
function csv(header: string[], rows: (string | number | boolean | null)[][]) {
  const cell = (v: string | number | boolean | null) => {
    let s = v === null ? "" : typeof v === "boolean" ? (v ? "sim" : "não") : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // evita fórmula no Excel
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return new NextResponse("Não encontrado", { status: 404 });

  const aba = new URL(req.url).searchParams.get("aba") ?? "avisos";
  let body: string;
  if (aba === "clientes") {
    const list = await getCustomers();
    body = csv(
      ["Nome", "E-mail", "WhatsApp", "Autorizou novidades", "Compras pagas", "Gasto (R$)", "Pedidos sem pagar", "Último pedido"],
      list.map((c) => [c.name, c.email, c.phone ? formatPhone(c.phone) : "", c.optin, c.paidOrders,
        (c.paidCents / 100).toFixed(2).replace(".", ","), c.pendingOrders, day(c.lastAt)])
    );
  } else if (aba === "fotografos") {
    const list = await getPhotographers();
    body = csv(
      ["Nome", "E-mail", "WhatsApp", "Instagram", "Fotografa", "Fundador", "Comissão (%)", "Cadastro"],
      list.map((p) => [p.name, p.email, p.whatsapp ? formatPhone(p.whatsapp) : "", p.instagram ? `@${p.instagram}` : "",
        p.modalities.join(", "), p.founder, p.feePct, day(p.createdAt)])
    );
  } else {
    const list = await getAlerts();
    body = csv(
      ["Nome", "WhatsApp", "Peito", "Autorizou novidades", "Foto disponível", "Avisado em", "Pedido em"],
      list.map((a) => [a.name, formatPhone(a.phone), a.bib, a.optin, a.available, day(a.notifiedAt), day(a.createdAt)])
    );
  }
  const name = `wodfotos-${aba}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
