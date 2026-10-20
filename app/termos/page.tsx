import Link from "next/link";

export const metadata = { title: "Termos de uso" };

/** Preencha quando a empresa estiver aberta. Enquanto estiver vazio, a linha não aparece no site. */
const OPERADORA = ""; // ex.: "Flagra Run Fotografia LTDA, CNPJ 00.000.000/0001-00, Belo Horizonte/MG"
const REEMBOLSO_DIAS = 7;
const GUARDA_DIAS = 90;

const S = {
  h2: { fontSize: 22, margin: "30px 0 8px" },
  p: { margin: "0 0 10px", maxWidth: "68ch" },
  ul: { margin: "0 0 10px", paddingLeft: 20, maxWidth: "68ch" },
} as const;

export default function Termos() {
  return (
    <div className="wrap" style={{ paddingBlock: "36px 60px" }}>
      <span className="label">Flagra Run</span>
      <h1 style={{ fontSize: 40, marginTop: 8 }}>Termos de uso</h1>
      <p className="muted" style={S.p}>
        As regras do site em linguagem simples. Ao criar uma conta, comprar uma foto ou publicar um álbum, você concorda
        com elas e com a <Link href="/privacidade">Política de privacidade</Link>. Última atualização: outubro de 2026.
      </p>

      <h2 style={S.h2}>1. Quem é quem</h2>
      <ul style={S.ul}>
        <li><b>Flagra Run:</b> a plataforma, de Belo Horizonte, que liga fotógrafos a quem aparece nas fotos.
          {OPERADORA ? ` Operada por ${OPERADORA}.` : ""}</li>
        <li><b>Fotógrafo:</b> pessoa (a partir de 18 anos) ou empresa que publica álbuns e vende as fotos que tirou.</li>
        <li><b>Comprador:</b> quem escolhe e paga por fotos.</li>
        <li><b>Fotografado:</b> quem aparece numa foto, de qualquer idade, tenha comprado ou não.</li>
        <li><b>Organizador:</b> quem realiza o evento ou contrata o fotógrafo.</li>
        <li><b>Usuário:</b> qualquer um dos anteriores.</li>
      </ul>

      <h2 style={S.h2}>2. O que o Flagra Run faz (e o que não faz)</h2>
      <p style={S.p}>
        O fotógrafo publica o álbum; o atleta encontra as próprias fotos pelo número de peito ou por selfie, paga no Pix
        e baixa a foto sem marca d&apos;água. O Flagra Run apenas <b>intermedeia</b> essa venda. As fotos são de autoria
        e responsabilidade do fotógrafo, e o Flagra Run não é parte do que for combinado entre os usuários fora do site.
        Não prometemos que cada atleta terá fotos de cada evento nem que o site ficará sempre no ar.
      </p>

      <h2 style={S.h2}>3. Cadastro e conta</h2>
      <ul style={S.ul}>
        <li>Quem compra não precisa de conta. Fotógrafos entram com e-mail e senha (ou link enviado ao e-mail) e
          preenchem o perfil com dados verdadeiros. Informação falsa pode ser crime e leva à exclusão da conta.</li>
        <li>A conta é pessoal e intransferível. Guarde sua senha: o que for feito com ela é de sua responsabilidade.
          Se suspeitar de uso indevido, avise a gente na hora.</li>
        <li>O Flagra Run pode pedir documentos ou dados extras para confirmar a identidade do fotógrafo, e pode
          recusar, suspender ou excluir contas, a qualquer momento, que descumpram estes termos, a lei ou que sirvam
          para fraude ou conduta ofensiva.</li>
        <li>Menores de 18 anos usam o site com apoio de um responsável. Fotógrafos precisam ter 18 anos ou mais.</li>
      </ul>

      <h2 style={S.h2}>4. Para quem compra</h2>
      <ul style={S.ul}>
        <li><b>O que você compra:</b> uma licença de <b>uso pessoal</b> da foto, em alta resolução e sem marca d&apos;água.
          Pode guardar, imprimir e postar nas suas redes, marcando o fotógrafo quando possível.</li>
        <li><b>O que não pode:</b> revender, usar em propaganda, em produto à venda ou em material comercial sem
          autorização do fotógrafo. A foto vem como o fotógrafo a entregou, sem tratamento extra.</li>
        <li><b>Pagamento:</b> por Pix. O preço aparece antes de pagar, e o desconto por quantidade, quando houver, é
          calculado no carrinho. O CPF é exigido pelo PagBank para gerar o Pix.</li>
        <li><b>Entrega:</b> assim que o Pix é confirmado, as fotos ficam na página do pedido, com links de download
          renovados a cada acesso. Guarde o link da página. Se perder, fale com a gente pelo WhatsApp informado.</li>
        <li><b>Prazo de guarda:</b> mantemos as fotos compradas disponíveis por pelo menos {GUARDA_DIAS} dias. O
          Flagra Run não é serviço de backup: baixe e guarde as suas.</li>
      </ul>

      <h2 style={S.h2}>5. Arrependimento, troca e reembolso</h2>
      <ul style={S.ul}>
        <li>Se a foto não abrir, vier com defeito ou não for a que você escolheu, a gente troca ou devolve o valor.</li>
        <li>Se você se arrepender da compra, devolvemos o valor se pedir em até <b>{REEMBOLSO_DIAS} dias corridos</b>{" "}
          da compra <b>e</b> ainda não tiver baixado as fotos, já que o arquivo baixado não tem como ser devolvido.</li>
        <li>O reembolso volta por Pix, para a conta de quem pagou, em até 10 dias úteis depois de aprovado.</li>
        <li>Para pedir: WhatsApp ou Instagram <b>@flagrarun</b>, informando o nome, o e-mail e o número do pedido. Seus
          direitos do Código de Defesa do Consumidor continuam valendo.</li>
      </ul>

      <h2 style={S.h2}>6. Prévias com marca d&apos;água e proteção das fotos</h2>
      <p style={S.p}>
        As fotos mostradas antes da compra são prévias com marca d&apos;água, em resolução menor, só para você escolher.
        Para proteger o trabalho dos fotógrafos, o site usa marca d&apos;água e travas que podem borrar a imagem ao
        tentar copiar, arrastar, imprimir ou capturar a tela. Nenhuma trava é perfeita, e o que vale é a regra:
        é proibido baixar, capturar a tela, recortar ou retirar a marca d&apos;água para usar a prévia sem comprar. Isso
        viola o direito autoral (Lei 9.610/1998), e o Flagra Run pode bloquear o acesso de quem fizer isso, sem
        prejuízo das medidas legais do fotógrafo.
      </p>

      <h2 style={S.h2}>7. Para os fotógrafos</h2>
      <ul style={S.ul}>
        <li><b>Autoria:</b> você declara que é o autor das fotos, ou que recebeu autorização total para vendê-las. O
          direito autoral continua seu, e a responsabilidade pelas imagens publicadas também.</li>
        <li><b>Licença ao Flagra Run:</b> você autoriza o site a guardar as fotos, gerar prévias com marca d&apos;água,
          exibir, indexar rostos para a busca por selfie, entregar a foto a quem comprar e mostrar seu nome e perfil
          como autor. Pode usar imagens de álbuns publicados (sempre com crédito) para divulgar o Flagra Run.</li>
        <li><b>Autorizações:</b> cabe a você e ao organizador do evento obter as autorizações necessárias de local e de
          uso de imagem. Fotografe em lugares públicos ou com autorização.</li>
        <li><b>Conteúdo proibido:</b> nada de fotos ofensivas, íntimas, discriminatórias, violentas, ilegais ou que
          exponham alguém ao ridículo. Fotos que alguém peça para tirar do ar devem sair na hora.</li>
        <li><b>Comissão:</b> o Flagra Run retém um percentual do valor bruto de cada venda, mostrado no seu painel antes de
          você publicar. Os 30 primeiros fotógrafos (Plano Fundador) ficam com 10% para sempre; os demais, com 12%.
          Sem mensalidade, sem taxa de upload, com a busca por selfie incluída. Mudanças futuras de taxa valem só para
          vendas novas e são avisadas antes.</li>
        <li><b>Repasse:</b> o valor das suas vendas, já descontada a comissão, é pago por Pix, com saldo e histórico
          visíveis no painel. Taxas de pagamento do PagBank e tributos sobre o seu ganho são tratados conforme a lei;
          quem declara e recolhe os seus impostos é você.</li>
        <li><b>Retirada pelo site:</b> o Flagra Run pode tirar do ar, sem aviso prévio, fotos que violem estes termos ou
          direitos de terceiros, e suspender contas reincidentes.</li>
        <li><b>Fora da plataforma:</b> não use o Flagra Run para levar compradores a vender por fora ou para divulgar
          serviço concorrente nos álbuns.</li>
      </ul>

      <h2 style={S.h2}>8. Busca por selfie e direito de imagem</h2>
      <p style={S.p}>
        A busca por selfie só acontece com a sua autorização, e a selfie não é guardada. Quem aparece numa foto pode
        tirá-la da busca e da venda a qualquer momento em <Link href="/remover-rosto">Remover minhas fotos</Link>, sem
        precisar justificar. Para menores de idade, o pedido pode ser feito pelo responsável. Os detalhes estão na{" "}
        <Link href="/privacidade">Política de privacidade</Link>.
      </p>

      <h2 style={S.h2}>9. Denúncias</h2>
      <p style={S.p}>
        Viu uma foto com direito autoral violado, sua imagem usada de forma indevida ou conteúdo ofensivo? Fale com a
        gente pelo Instagram <b>@flagrarun</b> ou pelo WhatsApp do Flagra Run, com o link da foto. Analisamos rápido e
        tiramos do ar o que for contestado enquanto apuramos.
      </p>

      <h2 style={S.h2}>10. Uso do site e propriedade intelectual</h2>
      <ul style={S.ul}>
        <li>O site, a marca Flagra Run, o logotipo, o código e o banco de dados são do Flagra Run. Você recebe apenas
          uma licença de uso limitada, não exclusiva e intransferível.</li>
        <li>É proibido usar robôs, scripts ou outras ferramentas para copiar fotos, listas ou dados do site em
          escala, tentar acessar áreas restritas, fazer engenharia reversa, ou sobrecarregar o serviço.</li>
        <li>É proibido usar o site para fraude, para burlar pagamentos ou para qualquer fim ilegal. Quem fizer isso pode ter
          o acesso bloqueado, sem prejuízo de outras medidas legais.</li>
        <li>Não publique, em lugar nenhum, afirmações falsas ou ofensivas sobre o Flagra Run ou seus parceiros. Crítica
          honesta continua livre.</li>
      </ul>

      <h2 style={S.h2}>11. Pagamentos</h2>
      <p style={S.p}>
        Os pagamentos são processados pelo PagBank, instituição de pagamento autorizada pelo Banco Central. O Flagra Run
        é a plataforma e não faz o papel de banco nem guarda o seu CPF ou dados de pagamento. O relacionamento
        financeiro com o PagBank segue as regras dele.
      </p>

      <h2 style={S.h2}>12. Comunicações</h2>
      <p style={S.p}>
        Mandamos mensagens sobre o seu pedido por e-mail e WhatsApp. Novidades e promoções só com a sua autorização (a
        caixa do carrinho vem desmarcada) e você sai quando quiser respondendo a mensagem ou falando com a gente.
      </p>

      <h2 style={S.h2}>13. Disponibilidade e limites de responsabilidade</h2>
      <p style={S.p}>
        O site é oferecido como está e pode ficar fora do ar por manutenção ou falha de serviços parceiros
        (hospedagem, banco de dados, PagBank, reconhecimento facial). Nesses casos, nenhum pagamento é perdido: o pedido
        continua registrado e as fotos ficam disponíveis assim que o site volta. O Flagra Run não responde pelo conteúdo
        das fotos, nem por danos causados entre usuários, por fatos de terceiros, caso fortuito ou força maior, sem
        prejuízo do que o Código de Defesa do Consumidor garante a quem compra.
      </p>

      <h2 style={S.h2}>14. Mudanças, validade e contato</h2>
      <p style={S.p}>
        Estes termos podem mudar; a versão em vigor é sempre a desta página, com a data no topo, e mudanças relevantes
        serão avisadas. Se alguma regra for considerada inválida, as demais continuam valendo. O Flagra Run não cria
        vínculo de sociedade ou emprego com os usuários e a falta de exigência de um direito não é renúncia a ele.
      </p>
      <p style={S.p}>
        Dúvidas, pedidos e reclamações: Instagram <b>@flagrarun</b> ou o WhatsApp informado nas mensagens do Flagra Run.
        Fica eleito o foro de Belo Horizonte, MG, salvo o direito do consumidor de usar o foro do seu domicílio.
      </p>
    </div>
  );
}
