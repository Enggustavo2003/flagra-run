import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Antigo aviso do PagBank. Os pagamentos agora passam pelo Asaas (/api/webhooks/asaas).
export async function POST() {
  return NextResponse.json({ ok: true });
}
