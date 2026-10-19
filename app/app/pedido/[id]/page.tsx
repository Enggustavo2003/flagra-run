import { notFound } from "next/navigation";
import { PixBox } from "@/components/pix-box";
import { brl, isUuid, previewUrl } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu pedido", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export default async function Pedido({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!isUuid(id) || !t) notFound();

  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("id, access_token, status, buyer_name, total_cents, pix_qr_code, pix_qr_base64, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.access_token !== t) notFound();

  const { data: items } = await db
    .from("order_items")
    .select("photo_id, photos(original_path, preview_path, bibs, events(name))")
    .eq("order_id", id);
  const list = (items ?? []) as any[];

  if (order.status === "paid") {
    // Links assinados de 24h para as fotos originais (o bucket é privado)
    const links = await Promise.all(
      list.map(async (it, i) => {
        const path = it.photos.original_path as string;
        const ext = path.split(".").pop() || "jpg";
        const [view, dl] = await Promise.all([
          db.storage.from("originals").createSignedUrl(path, 60 * 60 * 24),
          db.storage
            .from("originals")
            .createSignedUrl(path, 60 * 60 * 24, { download: `flagra-run-${i + 1}.${ext}` }),
        ]);
        return { view: view.data?.signedUrl, dl: dl.data?.signedUrl, ...it };
      })
    );
    return (
      <div className="wrap" style={{ paddingBottom: 40 }}>
        <div className="ev-head">
          <div>
            <span className="status paid">
              <i /> Pagamento aprovado
            </span>
            <h1 style={{ marginTop: 8 }}>Suas fotos, {order.buyer_name.split(" ")[0]}</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Alta resolução, sem marca d&apos;água. Salve o link desta página para baixar de novo depois.
            </p>
          </div>
        </div>
        <div className="up-grid">
          {links.map((l) => (
            <div className="up" key={l.photo_id}>
              <img src={l.view ?? previewUrl(l.photos.preview_path)} alt="" loading="lazy" />
              <div className="row">
                <span>{l.photos.events?.name}</span>
              </div>
              {l.dl && (
                <a className="btn small" style={{ borderRadius: 0 }} href={l.dl}>
                  Baixar
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="wrap" style={{ paddingBlock: "40px 60px" }}>
        <div className="empty">
          <h3>Este pedido foi cancelado</h3>O Pix expirou ou o pagamento não foi concluído. Volte ao evento e
          monte o carrinho de novo.
        </div>
      </div>
    );
  }

  return (
    <div className="wrap two">
      <div className="panel form">
        <span className="status">
          <i /> Aguardando o Pix
        </span>
        <h1 style={{ fontSize: 30 }}>Pague {brl(order.total_cents)} para liberar as fotos</h1>
        <PixBox
          orderId={order.id}
          token={t}
          qrCode={order.pix_qr_code}
          qrBase64={order.pix_qr_base64}
        />
      </div>
      <div className="panel">
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>
          {list.length} {list.length === 1 ? "foto" : "fotos"} no pedido
        </h2>
        {list.map((it) => (
          <div className="line" key={it.photo_id}>
            <img src={previewUrl(it.photos.preview_path)} alt="" />
            <div style={{ minWidth: 0 }}>
              <b>{it.photos.events?.name}</b>
              <div className="bibs" style={{ marginTop: 4 }}>
                {(it.photos.bibs as number[]).map((b) => (
                  <span key={b} className="bibchip">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
