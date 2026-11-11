/**
 * Conferências que toda rota do admin faz. O proxy.ts já barra quem não tem
 * sessão, mas as rotas conferem de novo: o proxy é a primeira porta, não a única.
 */
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { CaminhoInvalidoError } from "./caminhos.ts";
import { origemValida } from "./origem.ts";
import { ConflitoError, RepositorioError } from "./repositorio.ts";
import { COOKIE_SESSAO, verificarSessao, type Sessao } from "./sessao.ts";

export { origemValida };

export function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/** Converte os erros do repositório numa resposta com mensagem para o professor. */
export function respostaDeFalha(erro: unknown) {
  if (erro instanceof ConflitoError) return respostaErro(erro.message, 409);
  if (erro instanceof CaminhoInvalidoError) return respostaErro(erro.message, 400);
  if (erro instanceof RepositorioError) {
    console.error(erro);
    return respostaErro(erro.message, 502);
  }
  console.error(erro);
  return respostaErro("Erro inesperado no servidor. Tente de novo; se continuar, avise a coordenação.", 500);
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
