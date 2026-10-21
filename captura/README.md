# Flagra Capture

App Android do fotógrafo: a câmera manda a foto pelo Wi-Fi (FTP), o app sobe para o evento no Flagra Run e ela fica à venda. Sem cartão, sem computador.

**Versão 1:** login, escolher evento, receber por FTP, fila que retoma sozinha, Rápido (3000 px) ou Original.
**Ainda não tem:** nota automática / aba Revisar, aviso automático no WhatsApp, iOS.

## Como funciona

1. A câmera envia cada foto por FTP para o celular (porta 2121).
2. O app guarda a foto e coloca na fila com o tamanho escolhido.
3. Rápido: reduz para 3000 px no maior lado. Original: manda o arquivo cheio.
4. Sobe para o Storage do Supabase (pasta `originals`, a mesma do site).
5. Chama `/api/captura/v1/fotos` do site, que gera a prévia com marca d'água, indexa a selfie e põe à venda.
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

## Destinos (preparado para vender o app separado)

Para onde a foto vai é uma peça trocável em `src/destinos/`. Hoje só existe `flagrarun.ts`.
Um destino novo (Google Drive, pasta local, FTP/SFTP de saída, outra plataforma com API) é:

1. um arquivo em `src/destinos/` que implementa `Destino.enviar()` (ver `tipos.ts`);
2. uma linha em `src/destinos/index.ts`;
3. a tela de escolha do destino e do "alvo" (no Flagra Run, o evento).

FTP, fila, Rápido/Original e as telas de captura não mudam.

## Compatibilidade

- **API versionada:** o app só chama `/api/captura/v1/...`. Mudou o site por dentro? A v1 continua igual. Mudança que quebra = criar `v2` e manter a `v1` até os APKs antigos saírem de uso.
- **APK antigo:** o app consulta `/api/captura/v1/info` ao abrir. Para obrigar atualização, coloque na Vercel `CAPTURE_MIN_VERSION` (ex.: `1.1.0`) e `CAPTURE_DOWNLOAD_URL` (link do APK novo). A versão do app fica em `src/config.ts` (`APP_VERSION`): suba a cada APK novo.
- **Fila antiga:** a fila gravada pela versão anterior é convertida sozinha ao abrir o app.
- **Formatos:** só JPEG vai à venda. RAW (CR3, NEF, ARW...), HEIF e vídeo que a câmera mandar são apagados na hora e o app avisa. Configure a câmera para mandar JPEG pelo FTP.
- **Várias câmeras:** testado com 3 câmeras enviando ao mesmo tempo. Cada foto ganha um nome único no celular, sem sobrescrever.
- **Rápido tira os dados EXIF** (horário, câmera). Original mantém. Se um dia precisar do horário da foto (ex.: casar com o tempo do chip), mandar o horário junto no envio.

## Próximas versões

- **Revisar antes de vender (Fase 2):** aba para ver as fotos recebidas e apagar as ruins antes de irem para a venda.
- **Ajuste automático simples:** brilho e contraste iguais para todas as fotos do evento, com um predefinido escolhido pelo fotógrafo. Edição manual foto a foto fica fora do app, de propósito: atrasa a venda.
- Tela apagada com o FTP ligado (serviço em primeiro plano), alerta automático por WhatsApp e leitura do número de peito (Fase 4), CCAPI, publicação na Play Store, venda separada (login, cobrança e escolha de destino) e versão para iPhone.

## Desenvolvimento

```bash
cd captura
npm ci
npx tsc --noEmit
npx expo prebuild --platform android   # gera a pasta android/ (não versionada)
```

O servidor FTP fica em `modules/flagra-ftp` (Java puro em `FtpServer.java` + ponte Kotlin). O Expo Go não roda o FTP: precisa do APK.
