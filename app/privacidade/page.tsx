import Link from "next/link";

export const metadata = { title: "Privacidade" };

/** Preencha quando a empresa estiver aberta. Enquanto estiver vazio, a linha não aparece no site. */
const CONTROLADORA = ""; // ex.: "Flagra Run Fotografia LTDA, CNPJ 00.000.000/0001-00, Belo Horizonte/MG"
const GUARDA_DIAS = 90;

const S = {
  h2: { fontSize: 22, margin: "30px 0 8px" },
  p: { margin: "0 0 10px", maxWidth: "68ch" },
  ul: { margin: "0 0 10px", paddingLeft: 20, maxWidth: "68ch" },
} as const;

export default function Privacidade() {
  return (
    <div className="wrap" style={{ paddingBlock: "36px 60px" }}>
      <span className="label">Flagra Run</span>
      <h1 style={{ fontSize: 40, marginTop: 8 }}>Política de privacidade</h1>
      <p className="muted" style={S.p}>
        Em linguagem simples: quais dados o Flagra Run guarda, por quê, com quem divide e como você exerce seus direitos
        pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Vale junto com os{" "}
        <Link href="/termos">Termos de uso</Link>. Última atualização: outubro de 2026.
      </p>

      <h2 style={S.h2}>1. Quem cuida dos seus dados</h2>
      <p style={S.p}>
        O Flagra Run é a controladora dos dados tratados no site, ou seja, quem decide por que e como eles são usados.
        {CONTROLADORA ? ` ${CONTROLADORA}.` : ""} Para qualquer pedido sobre dados, fale com a gente pelo Instagram{" "}
        <b>@flagrarun</b> ou pelo WhatsApp informado nas mensagens do Flagra Run.
      </p>
      <p style={S.p}>
        O Flagra Run é para maiores de 18 anos como fotógrafo. Quem compra pode ser menor de idade com apoio de um
        responsável, e o responsável pode pedir qualquer providência sobre as fotos de um menor.
      </p>

      <h2 style={S.h2}>2. Que dados guardamos e para quê</h2>
      <ul style={S.ul}>
        <li><b>Quem compra:</b> nome, e-mail e WhatsApp, para liberar as fotos, registrar o pedido e falar com você sobre
          ele (base legal: execução do contrato). O CPF é enviado só ao PagBank, que exige o dado para gerar o Pix. O
          Flagra Run não guarda o CPF nem dados do pagamento.</li>
        <li><b>Novidades e promoções:</b> só se você marcar a caixa de autorização no carrinho (consentimento). Para
          sair, é só responder a mensagem ou falar com a gente.</li>
        <li><b>Aviso de fotos:</b> se você pedir para ser avisado quando suas fotos chegarem, guardamos nome, WhatsApp e
          número de peito só para isso (consentimento).</li>
        <li><b>Fotógrafos:</b> e-mail de acesso, nome, WhatsApp, Instagram, o que fotografam e as fotos que publicam,
          para manter a conta, vender, calcular a comissão e fazer o repasse (execução do contrato). Os dados do
          repasse por Pix ficam registrados no painel.</li>
        <li><b>Fotos e quem aparece nelas:</b> as imagens publicadas pelo fotógrafo, para você encontrar e comprar as suas
          (veja o item 3).</li>
        <li><b>Contato:</b> o que você nos manda pelo Instagram ou WhatsApp, para responder.</li>
        <li><b>Uso do site:</b> o servidor registra dados técnicos como endereço IP e tipo de navegador, para segurança e para
          evitar fraude. Não usamos ferramentas de publicidade nem perfis de comportamento.</li>
      </ul>
      <p style={S.p}>
        Também podemos tratar dados para cumprir obrigações legais e fiscais, para prevenir fraudes e para nos defender
        em processos.
      </p>

      <h2 style={S.h2}>3. Reconhecimento facial (dado sensível)</h2>
      <p style={S.p}>
        O rosto é dado biométrico, considerado sensível pela LGPD. Por isso a busca por selfie funciona assim:
      </p>
      <ul style={S.ul}>
        <li><b>Nas fotos publicadas:</b> quando o fotógrafo sobe uma foto, os rostos dela são indexados para que cada
          pessoa encontre as próprias fotos. Guardamos o identificador do rosto ligado à foto. O serviço que faz essa
          comparação, o Amazon Rekognition, guarda uma representação matemática do rosto (não a foto) em servidores em São
          Paulo. Ela é usada só para a busca e para nenhuma outra finalidade.</li>
        <li><b>Na sua selfie:</b> você autoriza antes de enviar. A selfie é comparada com o índice e descartada em
          seguida: não guardamos a selfie nem o resultado da comparação.</li>
        <li><b>Quando a foto sai do site</b> (o fotógrafo a remove, ou você pede), os rostos dela saem do índice.</li>
        <li><b>Sem compartilhar:</b> não vendemos nem repassamos dados faciais a ninguém, e não usamos para publicidade.</li>
      </ul>
      <p style={S.p}>
        Quem tira as fotos, o fotógrafo, é responsável por obter as autorizações de captura e de uso de imagem junto ao
        organizador do evento, conforme os Termos de uso.
      </p>

      <h2 style={S.h2}>4. Tirar as suas fotos do site</h2>
      <p style={S.p}>
        Você pode remover as fotos em que aparece a qualquer momento, sem precisar justificar. Elas saem da busca e da
        venda, e o seu rosto sai do índice.
      </p>
      <p style={S.p}>
        <Link className="btn" href="/remover-rosto">
          Remover minhas fotos
        </Link>
      </p>

      <h2 style={S.h2}>5. Com quem dividimos os dados</h2>
      <p style={S.p}>Só com quem precisa para o site funcionar, e cada um só recebe o necessário para a sua parte:</p>
      <ul style={S.ul}>
        <li><b>PagBank:</b> processa o Pix.</li>
        <li><b>Supabase:</b> banco de dados e armazenamento das fotos.</li>
        <li><b>Vercel:</b> hospedagem do site.</li>
        <li><b>Amazon Web Services (Rekognition):</b> busca por rosto, em servidores em São Paulo.</li>
        <li><b>O fotógrafo da foto:</b> vê o que foi vendido e o valor, mas não o seu contato.</li>
        <li><b>Autoridades:</b> quando a lei ou uma ordem judicial exigir, ou para prevenir fraude.</li>
        <li><b>Venda ou reorganização do negócio:</b> os dados seguem protegidos por esta política.</li>
      </ul>
      <p style={S.p}>
        Alguns desses parceiros usam servidores fora do Brasil, o que configura transferência internacional de dados.
        Nesses casos usamos empresas com contrato de proteção de dados e salvaguardas previstas no art. 33 da LGPD.
      </p>

      <h2 style={S.h2}>6. Cookies e armazenamento no navegador</h2>
      <p style={S.p}>
        Usamos apenas o que é necessário para o site funcionar: o cookie de login (fotógrafos) e o carrinho de compras,
        guardado no seu navegador. Não usamos cookies de publicidade nem de rastreamento. Se você bloquear esses itens, o
        login e o carrinho podem não funcionar.
      </p>

      <h2 style={S.h2}>7. Por quanto tempo guardamos</h2>
      <ul style={S.ul}>
        <li><b>Fotos compradas:</b> ficam disponíveis por pelo menos {GUARDA_DIAS} dias. O Flagra Run não é serviço de
          backup, então baixe as suas.</li>
        <li><b>Dados do pedido e do fotógrafo:</b> enquanto a conta existir e pelo tempo que a lei exigir (fiscal, defesa
          em processos).</li>
        <li><b>Aviso de fotos e marketing:</b> até você pedir para sair.</li>
        <li><b>Selfie:</b> não é guardada.</li>
      </ul>

      <h2 style={S.h2}>8. Seus direitos</h2>
      <p style={S.p}>
        Pela LGPD você pode pedir, quando quiser e de graça: confirmação de que tratamos seus dados, acesso a eles,
        correção, anonimização ou eliminação, portabilidade, informação sobre com quem compartilhamos, e revogar o
        consentimento. Você também pode se opor a um tratamento que considere indevido e pedir revisão de decisões
        automatizadas. Ao pedir, podemos conferir quem você é para proteger seus dados.
      </p>
      <p style={S.p}>
        Respondemos em até 15 dias, e os pedidos simples, como sair da lista de WhatsApp ou remover suas fotos, em geral
        no mesmo dia. Se achar que não cuidamos bem do seu pedido, você pode reclamar à Autoridade Nacional de Proteção
        de Dados (ANPD).
      </p>

      <h2 style={S.h2}>9. Segurança</h2>
      <p style={S.p}>
        O site usa conexão criptografada (HTTPS). As fotos originais, sem marca d&apos;água, ficam em armazenamento privado
        e só saem por link temporário, depois do pagamento. O acesso ao banco e às áreas de gestão é restrito e
        protegido por senha. Se acontecer um incidente de segurança que possa afetar você, avisamos você e a ANPD, nos
        casos previstos em lei.
      </p>

      <h2 style={S.h2}>10. Mudanças</h2>
      <p style={S.p}>
        Podemos atualizar esta política. A versão em vigor é sempre a desta página, com a data no topo, e mudanças
        relevantes serão avisadas pelo site ou por e-mail.
      </p>
    </div>
  );
}
