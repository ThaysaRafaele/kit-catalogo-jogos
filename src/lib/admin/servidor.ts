/**
 * Peças de toda rota do admin: sessão, leitura do pedido e tradução dos erros em
 * resposta. O proxy.ts já barra quem não tem sessão, mas as rotas conferem de
 * novo: o proxy é a primeira porta, não a única.
 */
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { CaminhoInvalidoError } from "./caminhos.ts";
import { ValidacaoError } from "./formulario.ts";
import { ImagemInvalidaError } from "./imagem.ts";
import { origemValida } from "./origem.ts";
import { ConflitoError, RepositorioError } from "./repositorio.ts";
import { COOKIE_SESSAO, type Sessao } from "./sessao.ts";
import { sessaoValida } from "./usuarios.ts";

export { origemValida };

export function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/** Resposta para pedido sem os dados esperados (ou sem o sha, quando ele é exigido). */
export const pedidoIncompleto = () => respostaErro("Recarregue a página e tente publicar de novo.", 400);

/** O único tradutor de erro → resposta: toda rota passa por aqui. */
export function respostaDeFalha(erro: unknown) {
  if (erro instanceof ValidacaoError) return NextResponse.json({ erro: erro.message, erros: erro.erros }, { status: 422 });
  if (erro instanceof ImagemInvalidaError) return respostaErro(erro.message, 400);
  if (erro instanceof ConflitoError) return respostaErro(erro.message, 409);
  if (erro instanceof CaminhoInvalidoError) return respostaErro(erro.message, 400);
  if (erro instanceof RepositorioError) {
    console.error(erro);
    return respostaErro(erro.message, 502);
  }
  console.error(erro);
  return respostaErro("Erro inesperado no servidor. Tente de novo; se continuar, avise a coordenação.", 500);
}

/**
 * Esqueleto de toda rota do admin: confere a origem e a sessão, executa, e
 * responde { ok: true, ...resultado } ou o erro traduzido por respostaDeFalha.
 * `executar` pode devolver uma resposta pronta (ex.: 400 de pedido malformado).
 */
export async function comSessao(
  req: NextRequest,
  executar: (sessao: Sessao) => Promise<object | NextResponse>,
): Promise<NextResponse> {
  if (req.method !== "GET" && req.method !== "HEAD" && !origemValida(req.headers)) {
    return respostaErro("Pedido recusado: origem inválida.", 403);
  }
  const sessao = sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) return respostaErro("Sua sessão expirou. Entre de novo.", 401);
  try {
    const resultado = await executar(sessao);
    return resultado instanceof NextResponse ? resultado : NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    return respostaDeFalha(erro);
  }
}

/** Para páginas do servidor. */
export async function sessaoAtual(): Promise<Sessao | null> {
  return sessaoValida((await cookies()).get(COOKIE_SESSAO)?.value);
}

/**
 * Leitor comum das rotas que publicam: JSON { entrada, sha }, ou multipart com o
 * campo "dados" (o mesmo JSON) e os arquivos nos `campos` pedidos. Nada é
 * processado aqui: quem chama confere o pedido antes de converter as imagens.
 */
export async function lerEntradaEArquivos(req: Request, campos: string[] = []) {
  let dados: unknown;
  const arquivos: Record<string, Buffer> = {};

  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    try {
      dados = JSON.parse(String(form.get("dados") ?? ""));
    } catch {
      return null;
    }
    for (const campo of campos) {
      const arquivo = form.get(campo);
      if (arquivo instanceof File && arquivo.size > 0) arquivos[campo] = Buffer.from(await arquivo.arrayBuffer());
    }
  } else {
    dados = await req.json().catch(() => null);
  }

  if (!dados || typeof dados !== "object" || !("entrada" in dados)) return null;
  const { entrada, sha } = dados as { entrada: unknown; sha?: unknown };
  return { entrada, sha: typeof sha === "string" && sha ? sha : null, arquivos };
}
