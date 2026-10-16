import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingBlock: "48px 60px" }}>
      <div className="empty">
        <h3>Página não encontrada</h3>
        <p>O link pode ter mudado ou o álbum foi retirado do ar.</p>
        <Link className="btn" href="/">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
