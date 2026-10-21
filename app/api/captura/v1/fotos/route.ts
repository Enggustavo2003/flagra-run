// API do app Flagra Capture, versão 1.
// O app chama sempre este endereço. Se a rota interna mudar, ela muda aqui por dentro
// e os APKs já instalados continuam funcionando. Mudança que quebra = nova pasta v2.
export const runtime = "nodejs";
export const maxDuration = 60;

export { POST } from "@/app/api/fotos/processar/route";
