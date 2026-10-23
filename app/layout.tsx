import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CookieNotice } from "@/components/cookie-notice";
import { PhotoShield } from "@/components/photo-shield";
import { CartCount, CartProvider } from "@/components/cart";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "WOD Fotos | Fotos da sua prova", template: "%s | WOD Fotos" },
  description:
    "Encontre e compre as fotos da sua corrida, pedal ou competição pelo número de peito. Sem marca d'água, em alta resolução.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap"
        />
      </head>
      <body>
        <CartProvider>
          <PhotoShield />
          <header className="top">
            <div className="wrap">
              <Link href="/" className="brand" aria-label="WOD Fotos, início">
                <span className="brand-mark">
                  <i />
                </span>
                <b>
                  wod<span>fotos</span>
                </b>
              </Link>
              <nav className="main" aria-label="Principal">
                <Link href="/">Buscar fotos</Link>
                <Link href="/painel">Sou fotógrafo</Link>
                <Link href="/carrinho">
                  Carrinho
                  <CartCount />
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="site">
            <div className="wrap">
              <span>© {new Date().getFullYear()} WOD Fotos · Fotos de corridas e eventos esportivos</span>
              <span>
                <Link href="/termos">Termos de uso</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/cookies">Cookies</Link> ·<Link href="/remover-rosto">Remover minhas fotos</Link> · Pix via Asaas
              </span>
            </div>
          </footer>
          <CookieNotice />
        </CartProvider>
      </body>
    </html>
  );
}
