import Link from "next/link";

export const metadata = { title: "Cookies" };

const S = {
  h2: { fontSize: 22, margin: "30px 0 8px" },
  p: { margin: "0 0 10px", maxWidth: "68ch" },
  ul: { margin: "0 0 10px", paddingLeft: 20, maxWidth: "68ch" },
} as const;

export default function Cookies() {
  return (
    <div className="wrap" style={{ paddingBlock: "36px 60px" }}>
      <span className="label">WOD Fotos</span>
      <h1 style={{ fontSize: 40, marginTop: 8 }}>Cookies</h1>
      <p className="muted" style={S.p}>
        Resumo: o WOD Fotos usa só o que é necessário para o site funcionar. Não usamos cookies de publicidade, de
        rastreamento nem de análise de comportamento. Última atualização: outubro de 2026.
      </p>

      <h2 style={S.h2}>O que é um cookie</h2>
      <p style={S.p}>
        É um pequeno arquivo que o site guarda no seu navegador para lembrar de algo, como quem está logado. Há também o
        armazenamento local do navegador, que serve para um papel parecido.
      </p>

      <h2 style={S.h2}>O que usamos</h2>
      <ul style={S.ul}>
        <li><b>Cookie de login (essencial):</b> mantém a sessão do fotógrafo e do administrador aberta. Quem só compra
          fotos não precisa dele.</li>
        <li><b>Carrinho (essencial):</b> as fotos que você escolheu ficam guardadas no armazenamento local do seu
          navegador, para não se perderem se você fechar a página.</li>
        <li><b>Lembrar deste aviso (essencial):</b> um marcador pequeno que registra que você já viu o aviso de cookies.</li>
      </ul>
      <p style={S.p}>
        Esses itens são estritamente necessários para o serviço que você pediu, por isso não precisam de consentimento
        pela LGPD. Nenhum deles é usado para publicidade e nenhum é vendido ou repassado.
      </p>

      <h2 style={S.h2}>O que não usamos</h2>
      <ul style={S.ul}>
        <li>Cookies de anúncios ou de remarketing.</li>
        <li>Ferramentas de análise que sigam você pelo site ou por outros sites.</li>
        <li>Mapeamento de cliques ou perfis de comportamento.</li>
      </ul>
      <p style={S.p}>
        Se um dia incluirmos algo além disso, como uma ferramenta de estatísticas, este aviso muda antes e pediremos a sua
        autorização para o que não for essencial.
      </p>

      <h2 style={S.h2}>Como apagar ou bloquear</h2>
      <p style={S.p}>
        Pelas configurações do navegador você pode apagar os dados do site ou bloquear cookies. Se bloquear, o login do
        fotógrafo e o carrinho podem deixar de funcionar. Fotos já compradas continuam acessíveis pelo link da página do
        pedido.
      </p>

      <h2 style={S.h2}>Dúvidas</h2>
      <p style={S.p}>
        Fale com a gente pelo Instagram <b>@wodfotos</b>. O resto do tratamento de dados está na{" "}
        <Link href="/privacidade">Política de privacidade</Link>.
      </p>
    </div>
  );
}
