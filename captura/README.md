# Flagra Capture

App Android do fotógrafo: a câmera manda a foto pelo Wi-Fi (FTP), o app sobe para o evento no Flagra Run e ela fica à venda. Sem cartão, sem computador.

**Versão 1:** login, escolher evento, receber por FTP, fila que retoma sozinha, Rápido (3000 px) ou Original.
**Ainda não tem:** nota automática / aba Revisar, aviso automático no WhatsApp, iOS.

## Como funciona

1. A câmera envia cada foto por FTP para o celular (porta 2121).
2. O app guarda a foto e coloca na fila com o tamanho escolhido.
3. Rápido: reduz para 3000 px no maior lado. Original: manda o arquivo cheio.
4. Sobe para o Storage do Supabase (pasta `originals`, a mesma do site).
5. Chama `/api/fotos/processar` do site, que gera a prévia com marca d'água, indexa a selfie e põe à venda.
6. Sem internet? A foto espera na fila e sobe quando o sinal volta.

## Colocar para rodar (uma vez)

### 1. Banco
No Supabase, **SQL Editor**, rode `supabase/migracao-captura.sql`. Ele grava de onde a foto veio (site/app) e o tamanho. Sem ele o app funciona, só não grava essa informação.

### 2. Código no e-mail de login
O app entra com um código de 6 dígitos. No Supabase, **Authentication > Emails > Magic Link**, deixe o modelo com o link **e** o código, por exemplo:

```html
<h2>Entrar no Flagra Run</h2>
<p><a href="{{ .ConfirmationURL }}">Entrar no site</a></p>
<p>No app Flagra Capture, digite o código: <strong>{{ .Token }}</strong></p>
```

O link continua funcionando para o site.

### 3. Site no ar com a mudança
A rota `/api/fotos/processar` agora aceita o login do app. Faça o deploy na Vercel (é só juntar na `main`).

### 4. Variáveis do build do APK
No GitHub: **Settings > Secrets and variables > Actions > aba Variables > New repository variable**:

| Nome | Valor |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | o mesmo `NEXT_PUBLIC_SUPABASE_URL` da Vercel |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | o mesmo `NEXT_PUBLIC_SUPABASE_ANON_KEY` (é pública) |
| `EXPO_PUBLIC_SITE_URL` | `https://flagrarun.com.br` |

Nunca coloque a `service_role` aqui.

### 5. Baixar o APK
**Actions > App Flagra Capture (APK Android)**. Rode (ou espere rodar sozinho depois de um push em `captura/`). Leva uns 15 minutos. No fim, baixe o `flagra-capture-N` em **Artifacts**, descompacte e instale o `app-release.apk` no celular (permita "instalar apps desconhecidos").

## No evento

1. Ligue o **roteador do celular** (ou coloque câmera e celular no mesmo Wi-Fi).
2. No app: entre, escolha o evento, escolha **Rápido** ou **Original** e toque **Ligar FTP**.
3. Na câmera, crie um servidor FTP com o que o app mostra: servidor (IP), porta **2121**, usuário **flagra**, a senha do app e **modo passivo**. Ative o envio automático depois de cada clique.
4. Deixe o app aberto. A tela não apaga enquanto o FTP estiver ligado.

Dica Canon (R6 / R6 II / R5): Menu de rede > Transferência FTP > Config. do servidor. Marque "Transf. automática". Sony e Nikon têm opção parecida em "Transferência FTP".

## Desenvolvimento

```bash
cd captura
npm ci
npx tsc --noEmit
npx expo prebuild --platform android   # gera a pasta android/ (não versionada)
```

O servidor FTP fica em `modules/flagra-ftp` (Java puro em `FtpServer.java` + ponte Kotlin). O Expo Go não roda o FTP: precisa do APK.
