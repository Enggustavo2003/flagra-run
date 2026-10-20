import Link from "next/link";

export const metadata = { title: "Termos de uso" };

const S = { h2: { fontSize: 22, margin: "28px 0 8px" }, p: { margin: "0 0 10px", maxWidth: "68ch" }, ul: { margin: "0 0 10px", paddingLeft: 20, maxWidth: "68ch" } } as const;

export default function Termos() {
  return (
    <div className="wrap" style={{ paddingBlock: "36px 60px" }}>
      <span className="label">Flagra Run</span>
      <h1 style={{ fontSize: 40, marginTop: 8 }}>Termos de uso</h1>
      <p className="muted" style={S.p}>
        As regras do site em linguagem simples. Ao comprar uma foto ou publicar um álbum, você concorda com elas.
        Última atualização: outubro de 2026.
      </p>

      <h2 style={S.h2}>1. O que é o Flagra Run</h2>
      <p style={S.p}>
        O Flagra Run é uma plataforma de Belo Horizonte que liga fotógrafos de corrida, treino de rua e eventos
        esportivos a quem aparece nas fotos. O fotógrafo publica o álbum, o atleta encontra as próprias fotos pelo
        número de peito ou por selfie, paga no Pix e baixa a foto sem marca d&apos;água. O Flagra Run intermedia a venda;
        quem tira e é dono das fotos é o fotógrafo.
      </p>

      <h2 style={S.h2}>2. Para quem compra</h2>
      <ul style={S.ul}>
        <li><b>O que você compra:</b> uma licença para uso pessoal da foto, em alta resolução e sem marca d&apos;água. Pode
          guardar, imprimir e postar nas suas redes, marcando o fotógrafo quando possível.</li>
        <li><b>O que não pode:</b> revender, usar em propaganda ou em produto à venda sem autorização do fotógrafo.</li>
        <li><b>Pagamento:</b> por Pix, processado pelo PagBank, que exige o CPF de quem paga. O preço aparece antes da compra.</li>
        <li><b>Entrega:</b> as fotos ficam na página do pedido, com links de download renovados a cada acesso. Guarde o
          link da página. Se perder, fale com a gente pelo WhatsApp informado na compra.</li>
        <li><b>Problemas e reembolso:</b> se a foto não abrir, vier com defeito ou não for a que você escolheu, a gente
          troca ou devolve o valor. Os direitos do Código de Defesa do Consumidor continuam valendo.</li>
      </ul>

      <h2 style={S.h2}>3. As prévias com marca d&apos;água</h2>
      <p style={S.p}>
        As fotos mostradas antes da compra são prévias com marca d&apos;água, em resolução menor, e servem só para você
        escolher. É proibido baixar, capturar a tela, recortar ou remover a marca d&apos;água para usar a prévia sem
        comprar. Isso viola o direito autoral do fotógrafo (Lei 9.610/1998), e o site pode bloquear quem fizer isso.
      </p>

      <h2 style={S.h2}>4. Para os fotógrafos</h2>
      <ul style={S.ul}>
        <li><b>Autoria:</b> você declara que é o autor das fotos que publica, ou que tem autorização para vendê-las. O
          direito autoral continua seu.</li>
        <li><b>Licença ao Flagra Run:</b> você autoriza o site a guardar, gerar prévias com marca d&apos;água, exibir,
          indexar rostos para a busca por selfie e entregar a foto a quem comprar.</li>
        <li><b>Comissão:</b> o Flagra Run fica com uma porcentagem de cada venda, mostrada no seu painel. Os 30 primeiros
          fotógrafos (Plano Fundador) ficam com 10% para sempre; os demais, com a taxa vigente no cadastro. Não há
          mensalidade nem taxa de upload.</li>
        <li><b>Repasse:</b> o valor das suas vendas, já descontada a comissão, é pago por Pix, com o saldo e o histórico
          visíveis no painel.</li>
        <li><b>Conduta:</b> fotografe em lugares públicos ou com autorização do organizador. Não publique fotos ofensivas,
          íntimas, que exponham alguém ao ridículo ou que alguém tenha pedido para não publicar. Remova na hora fotos
          contestadas pela pessoa retratada.</li>
      </ul>

      <h2 style={S.h2}>5. Busca por selfie e direito de imagem</h2>
      <p style={S.p}>
        A busca por selfie só acontece com a sua autorização, e a selfie não é guardada. Quem aparece numa foto pode
        tirá-la da busca e da venda a qualquer momento em{" "}
        <Link href="/remover-rosto">Remover minhas fotos</Link>, sem precisar justificar. Os detalhes estão na{" "}
        <Link href="/privacidade">Política de privacidade</Link>.
      </p>

      <h2 style={S.h2}>6. Contas e segurança</h2>
      <p style={S.p}>
        O acesso ao painel é pessoal. Não compartilhe sua senha ou o link de acesso. O Flagra Run pode suspender contas
        que publiquem conteúdo proibido, tentem burlar pagamentos ou usem o site para fins ilegais.
      </p>

      <h2 style={S.h2}>7. Limites de responsabilidade</h2>
      <p style={S.p}>
        O site pode ficar fora do ar por manutenção ou falha de serviços parceiros (hospedagem, banco de dados, PagBank).
        Nesses casos, nenhum pagamento é perdido: o pedido continua registrado e as fotos ficam disponíveis assim que o
        site volta. O Flagra Run não responde pelo conteúdo das fotos, que é de responsabilidade de quem as publicou.
      </p>

      <h2 style={S.h2}>8. Mudanças e contato</h2>
      <p style={S.p}>
        Estes termos podem mudar; a versão em vigor é sempre a desta página, com a data no topo. Dúvidas, pedidos e
        reclamações: Instagram <b>@flagrarun</b> ou o WhatsApp informado nas mensagens do Flagra Run. Fica eleito o
        foro de Belo Horizonte, MG, salvo o direito do consumidor de usar o foro do seu domicílio.
      </p>
    </div>
  );
}
