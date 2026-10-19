import Link from "next/link";

export const metadata = { title: "Privacidade" };

const S = { h2: { fontSize: 22, margin: "28px 0 8px" }, p: { margin: "0 0 10px", maxWidth: "68ch" } } as const;

export default function Privacidade() {
  return (
    <div className="wrap" style={{ paddingBlock: "36px 60px" }}>
      <span className="label">Flagra Run</span>
      <h1 style={{ fontSize: 40, marginTop: 8 }}>Política de privacidade</h1>
      <p className="muted" style={S.p}>
        Em linguagem simples: o que a gente guarda, por quê, e como você tira as suas fotos do site.
      </p>

      <h2 style={S.h2}>O que o Flagra Run faz</h2>
      <p style={S.p}>
        Fotógrafos publicam fotos de provas e de treinos de rua. Você encontra as fotos em que aparece pelo número
        de peito ou por uma selfie, e compra as que quiser.
      </p>

      <h2 style={S.h2}>Dados que guardamos</h2>
      <p style={S.p}>
        <b>Na compra:</b> nome, e-mail e WhatsApp, para liberar as fotos, registrar o pedido e falar com você sobre ele. Só mandamos novidades e promoções pelo WhatsApp se você marcar a caixa de autorização, e você pode pedir para sair a qualquer momento respondendo a mensagem. O CPF é enviado só ao PagBank,
        que exige o dado para gerar o Pix. O Flagra Run não guarda o CPF.
      </p>
      <p style={S.p}>
        <b>Aviso de fotos:</b> se você pedir para ser avisado quando suas fotos chegarem, guardamos nome, WhatsApp e número de peito só para isso.
      </p>
      <p style={S.p}>
        <b>Dos fotógrafos:</b> e-mail de acesso ao painel, nome, WhatsApp, Instagram, o que fotografam e as fotos que publicam.
      </p>

      <h2 style={S.h2}>Reconhecimento facial</h2>
      <p style={S.p}>
        Rosto é dado pessoal sensível pela LGPD. Por isso a busca facial funciona assim:
      </p>
      <p style={S.p}>
        <b>Nas fotos publicadas:</b> quando o fotógrafo sobe uma foto, os rostos dela são indexados para que cada
        pessoa consiga encontrar as próprias fotos. Guardamos apenas um identificador do rosto ligado à foto. O
        índice fica no Amazon Rekognition, em servidores em São Paulo, e não é usado para nenhuma outra finalidade.
        Quando a foto sai do site, os rostos dela saem do índice.
      </p>
      <p style={S.p}>
        <b>Na sua selfie:</b> você autoriza antes de enviar. A selfie é comparada com o índice e descartada em
        seguida. Não guardamos a selfie nem os dados do seu rosto.
      </p>

      <h2 style={S.h2}>Tirar as suas fotos do site</h2>
      <p style={S.p}>
        Você pode remover as fotos em que aparece a qualquer momento, sem precisar justificar. Elas saem da busca e
        da venda, e o seu rosto sai do índice.
      </p>
      <p style={S.p}>
        <Link className="btn" href="/remover-rosto">
          Remover minhas fotos
        </Link>
      </p>

      <h2 style={S.h2}>Seus direitos</h2>
      <p style={S.p}>
        Pela LGPD você pode pedir acesso, correção ou exclusão dos seus dados e revogar o consentimento. Fale com a
        gente pelo Instagram <b>@flagrarun</b>.
      </p>
    </div>
  );
}
