# WOD Fotos

Marketplace de fotos de corridas e eventos esportivos. O fotógrafo sobe o álbum, o atleta acha as fotos pelo número de peito, paga no Pix e baixa em alta resolução, sem marca d'água.

**Tecnologia:** Next.js 15 · Supabase (banco, login e armazenamento) · Asaas (Pix) · hospedagem na Vercel.

---

## Colocar no ar: passo a passo

Faça na ordem. Tempo total: uns 40 minutos.

### 1. Supabase (banco de dados e fotos)

1. Em https://supabase.com/dashboard clique em **New project**.
   - Nome: `flagra-run`
   - Região: **South America (São Paulo)**
   - Anote a senha do banco num lugar seguro.
2. Quando o projeto terminar de criar, vá em **SQL Editor > New query**, cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**. Isso cria as tabelas, as regras de segurança e as duas pastas de fotos (`previews` pública, `originals` privada).
3. Vá em **Project Settings > API** e copie três valores:
   - `Project URL` → vai em `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → vai em `SUPABASE_SERVICE_ROLE_KEY` (secreta, nunca compartilhe)
4. Vá em **Authentication > URL Configuration**:
   - **Site URL:** o endereço do site (ex.: `https://wodfotos.com.br`)
   - **Redirect URLs:** adicione `https://wodfotos.com.br/auth/callback` e também o endereço provisório da Vercel, ex.: `https://flagra-run.vercel.app/auth/callback`

### 2. Asaas (receber no Pix)

1. Crie a conta em https://www.asaas.com e complete o cadastro (documentos). Em **Pix > Minhas chaves**, cadastre uma chave Pix.
2. **Teste (sandbox):** crie uma conta em https://sandbox.asaas.com, vá em **Integrações > API**, gere a chave → `ASAAS_API_KEY`, com `ASAAS_ENV=sandbox`.
3. **Produção (dinheiro de verdade):** na conta real, **Integrações > API** → `ASAAS_API_KEY`, com `ASAAS_ENV=production`.
4. **Aviso de pagamento (webhook):** em **Integrações > Webhooks > Criar Webhook**, URL `https://SEU-DOMINIO/api/webhooks/asaas`, clique em "Gerar token", cole o mesmo token em `ASAAS_WEBHOOK_TOKEN` na Vercel e marque os eventos de cobrança (pelo menos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`). Use envio sequencial.
5. O site pede o CPF de quem compra, porque o Asaas exige para gerar a cobrança. O CPF vai só para o Asaas, o WOD Fotos não guarda.

> Já tinha rodado o `schema.sql` antigo (da versão com Mercado Pago)? Rode uma vez o `supabase/migracao-pagbank.sql` no SQL Editor.

### 3. Vercel (o site no ar)

1. Suba este código para o repositório `flagra-run` no seu GitHub.
2. Na Vercel: **Add New > Project > Import** o repositório `flagra-run`.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre todas as variáveis do arquivo `.env.example`:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | do passo 1.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | do passo 1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | do passo 1.3 |
| `NEXT_PUBLIC_SITE_URL` | `https://wodfotos.com.br` (sem barra no final) |
| `ASAAS_API_KEY` | do passo 2 ou 3 |
| `ASAAS_ENV` | `sandbox` para testar, `production` para valer |
| `ASAAS_WEBHOOK_TOKEN` | o token do passo 4 |
| `PHOTOGRAPHER_EMAILS` | seu e-mail (só quem estiver aqui entra no painel) |
| `ADMIN_EMAILS` | seu e-mail (vê os pedidos e o WhatsApp dos clientes) |
| `PLATFORM_FEE_PCT` | `12` (só reserva; a comissão real fica no banco) |
| `PIX_FEE_CENTS` | `199` (taxa do Pix do Asaas por pedido, em centavos; descontada do repasse dos fotógrafos. Se não existir, vale 199) |
| `PAYMENTS_FAKE` | `0` |

4. Clique em **Deploy**. Em 2 minutos o site está no ar num endereço `.vercel.app`.

### 4. Domínio

1. Na Vercel: projeto > **Settings > Domains > Add** e digite o seu domínio.
2. A Vercel mostra os registros DNS. No Registro.br: **Domínio > DNS > Editar zona** e crie os registros que a Vercel pediu (normalmente um `A` para o domínio e um `CNAME` para o `www`).
3. Pode levar de alguns minutos até algumas horas para propagar. O SSL (cadeado) é automático.
4. Depois que o domínio funcionar, confira se `NEXT_PUBLIC_SITE_URL`, e o Site URL do Supabase estão com o domínio final (o endereço do webhook do Asaas é cadastrado à mão no painel).

### 5. Primeiro teste

1. Abra `/painel`, entre com o e-mail cadastrado em `PHOTOGRAPHER_EMAILS` e clique no link que chegar.
2. Crie um álbum, suba umas fotos, marque os números de peito e clique em **Publicar álbum**.
3. Na página inicial, busque um número de peito, adicione ao carrinho e pague com o Pix de teste.
4. A página do pedido atualiza sozinha quando o pagamento é aprovado e libera os downloads.

> Para testar o fluxo sem gateway, coloque `PAYMENTS_FAKE=1`: o pedido é aprovado na hora. **Volte para `0` antes de abrir para o público.**

---

## Rodar no seu computador

Precisa do Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # e preencha
npm run dev                  # abre em http://localhost:3000
```

---

## Como o sistema funciona

- **Fotos originais** ficam no bucket privado `originals`. Ninguém acessa sem pagar.
- **Prévias** com marca d'água são geradas no servidor (`lib/watermark.ts`) e ficam no bucket público `previews`.
- **Preço** é sempre recalculado no servidor. O carrinho do navegador só serve para mostrar.
- **Desconto:** 3 fotos ou mais no mesmo pedido = 20% off (`lib/pricing.ts`).
- **Pagamento:** o checkout cria o Pix no Asaas. O pedido é aprovado por dois caminhos: o webhook do Asaas (com o token conferido) e a própria página do pedido, que consulta a cada 5 segundos.
- **Entrega:** a página do pedido gera links assinados de 24h para as originais. O link da página (com o código `?t=`) é o comprovante do cliente.
- **Repasse:** cada item vendido guarda o fotógrafo e o valor já com desconto. O painel mostra o repasse já descontada a comissão e a taxa do Pix (`PIX_FEE_CENTS`, padrão R$ 1,99 por pedido, dividida entre os itens do pedido proporcional ao valor; cada item guarda a sua parte em `order_items.pix_fee_cents`). O pagamento ao fotógrafo é feito por você, manualmente, por enquanto.

## Próximos passos

1. **Envio do link do pedido por e-mail** (Resend), para o cliente não depender de salvar a página.
2. **Busca por selfie** com AWS Rekognition. Antes, colocar o consentimento de dado biométrico exigido pela LGPD.
3. **Leitura automática dos números de peito** (OCR) na hora do upload.
4. **Divisão de pagamento (split)** do Asaas para pagar o fotógrafo direto.
5. Páginas de **termos de uso** e **política de privacidade**.

---

## Busca por selfie (reconhecimento facial)

Fica desligada até `FACE_SEARCH=1`. Usa o Amazon Rekognition na região de São Paulo (`sa-east-1`).

**Como funciona**
- Ao subir uma foto, os rostos dela são indexados na coleção do Rekognition. O banco guarda só o identificador do rosto (`photo_faces`), não a imagem.
- O corredor manda uma selfie em `/selfie`, marca a autorização, e a selfie é comparada e descartada. Ela não é salva em lugar nenhum.
- Ao apagar uma foto, os rostos dela também saem da coleção.
- Álbuns enviados antes de ligar a busca: no painel do álbum aparece o botão **Ativar busca por selfie**, que indexa as fotos antigas em lotes.

**Configurar**
1. Supabase > SQL Editor: rode `supabase/migracao-busca-facial.sql`.
2. AWS: crie a conta, depois IAM > Users > Create user `flagra-run-rekognition`, com a política abaixo, e gere uma Access Key (tipo "Application running outside AWS").
3. Vercel > Environment Variables: `FACE_SEARCH=1`, `NEXT_PUBLIC_FACE_SEARCH=1`, `AWS_REGION=sa-east-1`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `REKOGNITION_COLLECTION=flagra-run`. Faça um novo deploy.

Política mínima do usuário IAM (troque `SEU_ID_DA_CONTA`):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["rekognition:CreateCollection", "rekognition:IndexFaces", "rekognition:SearchFacesByImage", "rekognition:DeleteFaces"],
    "Resource": "arn:aws:rekognition:sa-east-1:SEU_ID_DA_CONTA:collection/flagra-run"
  }]
}
```

**Treino de rua (sem número de peito)**
- Categoria **Treino de rua** no painel. O número de peito é opcional: o corredor acha as fotos pela selfie.
- Cada álbum tem o botão **Buscar com selfie**, que procura só dentro daquele álbum.

**Plano Fundador (comissão)**
- Os **30 primeiros fotógrafos** que se cadastrarem ficam com **10% de comissão para sempre**. Do 31º em diante, **12%**. A busca por selfie vem incluída para todos, sem mensalidade.
- Quem define isso é o banco, no cadastro (gatilho `photographer_plan` no SQL). O fotógrafo não consegue mudar a própria taxa.
- Cada venda guarda a comissão daquele fotógrafo (`order_items.fee_pct`), então o repasse fica certo mesmo se a regra mudar depois.
- Mudar a comissão de alguém, ou dar o status de fundador fora da regra: Supabase > Table Editor > `photographers` > colunas `fee_pct` e `founder`.
- Além da comissão, cada pedido paga a taxa do Pix (R$ 1,99 por pedido), descontada do repasse e dividida entre os fotógrafos do pedido.
- Preço sugerido por foto: R$ 14,90.

**Privacidade**
- `/privacidade`: política em linguagem simples (rascunho para o advogado revisar).
- `/remover-rosto`: o corredor manda uma selfie e o e-mail, vê as fotos em que aparece e remove. As fotos saem da busca e da venda (`photos.hidden`), os rostos saem do Rekognition e o pedido fica registrado em `face_removals`. A selfie é comparada de novo no servidor na confirmação, então ninguém consegue esconder foto de outra pessoa.
- Links para as duas páginas no rodapé e no consentimento da selfie.

**LGPD:** rosto é dado biométrico, ou seja, dado pessoal sensível. A selfie já pede autorização específica e em destaque. Antes de ligar, falta: política de privacidade explicando a busca facial, um canal para o atleta pedir a remoção dos seus rostos e a revisão de um advogado sobre a indexação das fotos dos eventos (base legal, prazo de retenção e relatório de impacto).

## Pedidos e WhatsApp dos clientes

- O carrinho pede o WhatsApp de quem compra (obrigatório). Ele fica no pedido (`orders.buyer_phone`) e também vai para o Asaas.
- Em `/painel/pedidos` (só para quem está em `ADMIN_EMAILS`) aparecem todos os pedidos, com filtro por situação e busca por nome, e-mail ou WhatsApp.
- O botão **WhatsApp** abre a conversa com a mensagem pronta: link das fotos para pedido pago, ou oferta de ajuda para pedido aguardando o Pix.
- Caixa **desmarcada** no carrinho: "Quero receber no WhatsApp aviso de álbuns novos e promoções" (`orders.marketing_optin`). Só quem marcou pode receber propaganda (LGPD).
- Busca por número de peito sem resultado: o corredor deixa nome e WhatsApp para ser avisado (`photo_alerts`).
- Perfil do fotógrafo no painel: nome, WhatsApp, Instagram e o que fotografa.
- `/painel/leads` (só `ADMIN_EMAILS`): abas Avisos de fotos (mostra quando já tem foto daquele peito e o botão **Avisar**), Clientes (agrupados por WhatsApp, com total gasto) e Fotógrafos. Filtro "Só quem autorizou", botão "Pediu para sair" e **Exportar planilha** (CSV que abre no Excel).
- Instalação antiga: rode `supabase/migracao-leads.sql` no SQL Editor **antes** de subir este código.

## Administração (/admin)

- Só para `ADMIN_EMAILS`. Entre em `/entrar` com e-mail e senha (crie a senha no painel, quadro **Senha de acesso**) ou pelo link no e-mail.
- Períodos 7, 30, 90 dias ou tudo, com comparação com o período anterior.
- Resultado da plataforma (comissão + taxa do Pix descontada dos fotógrafos − custo do Pix por pedido, `PIX_FEE_CENTS`), vendas, pedidos, ticket médio, fotos por pedido, conversão do Pix e venda que ficou sem pagar.
- Vendas por dia/mês, horário das vendas e álbuns que mais vendem.
- Base: clientes, recompra, autorizações, avisos abertos, fotógrafos e fundadores.
- **Repasses:** saldo de cada fotógrafo (direito dele − já pago). Depois de fazer o Pix, clique em **Registrar repasse** (`photographer_payouts`).
- Instalação antiga: rode `supabase/migracao-dashboard.sql` antes de subir o código.

**Taxa do Pix no repasse**
- Rode `supabase/migracao-taxa-pix.sql` no SQL Editor **antes** de subir este código (cria `order_items.pix_fee_cents`). Pedidos antigos ficam com 0.
