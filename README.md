# Flagra Run

Marketplace de fotos de corridas e eventos esportivos. O fotógrafo sobe o álbum, o atleta acha as fotos pelo número de peito, paga no Pix e baixa em alta resolução, sem marca d'água.

**Tecnologia:** Next.js 15 · Supabase (banco, login e armazenamento) · Mercado Pago (Pix) · hospedagem na Vercel.

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
   - **Site URL:** o endereço do site (ex.: `https://flagrarun.com.br`)
   - **Redirect URLs:** adicione `https://flagrarun.com.br/auth/callback` e também o endereço provisório da Vercel, ex.: `https://flagra-run.vercel.app/auth/callback`

### 2. Mercado Pago (receber no Pix)

1. Entre em https://www.mercadopago.com.br/developers/panel/app e crie uma aplicação (tipo: pagamentos online, sem loja pronta).
2. Em **Credenciais de teste**, copie o **Access Token** → `MP_ACCESS_TOKEN`. Comece com o de teste.
3. Em **Webhooks**, cadastre:
   - URL: `https://SEU-DOMINIO/api/webhooks/mercadopago`
   - Evento: **Pagamentos**
   - Copie a **assinatura secreta** → `MP_WEBHOOK_SECRET`
4. Quando tudo estiver testado, troque para o **Access Token de produção**. Para isso o Mercado Pago pede a conta verificada e uma chave Pix cadastrada.

### 3. Vercel (o site no ar)

1. Suba este código para o repositório `flagra-run` no seu GitHub.
2. Na Vercel: **Add New > Project > Import** o repositório `flagra-run`.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre todas as variáveis do arquivo `.env.example`:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | do passo 1.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | do passo 1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | do passo 1.3 |
| `NEXT_PUBLIC_SITE_URL` | `https://flagrarun.com.br` (sem barra no final) |
| `MP_ACCESS_TOKEN` | do passo 2.2 |
| `MP_WEBHOOK_SECRET` | do passo 2.3 |
| `PHOTOGRAPHER_EMAILS` | seu e-mail (só quem estiver aqui entra no painel) |
| `PLATFORM_FEE_PCT` | `15` |
| `PAYMENTS_FAKE` | `0` |

4. Clique em **Deploy**. Em 2 minutos o site está no ar num endereço `.vercel.app`.

### 4. Domínio

1. Na Vercel: projeto > **Settings > Domains > Add** e digite o seu domínio.
2. A Vercel mostra os registros DNS. No Registro.br: **Domínio > DNS > Editar zona** e crie os registros que a Vercel pediu (normalmente um `A` para o domínio e um `CNAME` para o `www`).
3. Pode levar de alguns minutos até algumas horas para propagar. O SSL (cadeado) é automático.
4. Depois que o domínio funcionar, confira se `NEXT_PUBLIC_SITE_URL`, o Site URL do Supabase e o webhook do Mercado Pago estão com o domínio final.

### 5. Primeiro teste

1. Abra `/painel`, entre com o e-mail cadastrado em `PHOTOGRAPHER_EMAILS` e clique no link que chegar.
2. Crie um álbum, suba umas fotos, marque os números de peito e clique em **Publicar álbum**.
3. Na página inicial, busque um número de peito, adicione ao carrinho e pague com o Pix de teste.
4. A página do pedido atualiza sozinha quando o pagamento é aprovado e libera os downloads.

> Para testar o fluxo sem Mercado Pago, coloque `PAYMENTS_FAKE=1`: o pedido é aprovado na hora. **Volte para `0` antes de abrir para o público.**

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
- **Pagamento:** o checkout cria o Pix no Mercado Pago. O pedido é aprovado por dois caminhos: o webhook do Mercado Pago e a própria página do pedido, que consulta a cada 5 segundos.
- **Entrega:** a página do pedido gera links assinados de 24h para as originais. O link da página (com o código `?t=`) é o comprovante do cliente.
- **Repasse:** cada item vendido guarda o fotógrafo e o valor já com desconto. O painel mostra o repasse descontada a comissão (`PLATFORM_FEE_PCT`). O pagamento ao fotógrafo é feito por você, manualmente, por enquanto.

## Próximos passos

1. **Envio do link do pedido por e-mail** (Resend), para o cliente não depender de salvar a página.
2. **Busca por selfie** com AWS Rekognition. Antes, colocar o consentimento de dado biométrico exigido pela LGPD.
3. **Leitura automática dos números de peito** (OCR) na hora do upload.
4. **Split automático** do Mercado Pago para pagar o fotógrafo direto.
5. Páginas de **termos de uso** e **política de privacidade**.
