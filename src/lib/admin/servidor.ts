/**
 * Conferências que toda rota do admin faz. O proxy.ts já barra quem não tem
 * sessão, mas as rotas conferem de novo: o proxy é a primeira porta, não a única.
 */
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { origemValida } from "./origem.ts";
import { COOKIE_SESSAO, verificarSessao, type Sessao } from "./sessao.ts";

export { origemValida };

export function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/** Para Route Handlers: a sessão, ou a resposta de erro pronta para devolver. */
export function exigirSessao(req: NextRequest): Sessao | NextResponse {
  if (req.method !== "GET" && req.method !== "HEAD" && !origemValida(req.headers)) {
    return respostaErro("Pedido recusado: origem inválida.", 403);
  }
  const sessao = verificarSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  return sessao ?? respostaErro("Sua sessão expirou. Entre de novo.", 401);
}

/** Para páginas do servidor. */
export async function sessaoAtual(): Promise<Sessao | null> {
  return verificarSessao((await cookies()).get(COOKIE_SESSAO)?.value);
}
