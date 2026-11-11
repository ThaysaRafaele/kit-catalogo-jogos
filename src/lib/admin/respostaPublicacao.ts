/** Resposta das rotas de publicação do jogo (POST de jogo novo e PUT de jogo existente). */
import { NextResponse } from "next/server";
import { publicarJogo, ValidacaoError, type PedidoPublicacao } from "./publicarJogo.ts";
import { respostaDeFalha } from "./servidor.ts";

export async function responderPublicacao(pedido: PedidoPublicacao) {
  try {
    const resultado = await publicarJogo(pedido);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    if (erro instanceof ValidacaoError) {
      return NextResponse.json({ erro: erro.message, erros: erro.erros }, { status: 422 });
    }
    return respostaDeFalha(erro);
  }
}

/** Corpo esperado: { entrada, sha }. */
export async function lerCorpo(req: Request): Promise<{ entrada: unknown; sha: string | null } | null> {
  const corpo = (await req.json().catch(() => null)) as { entrada?: unknown; sha?: unknown } | null;
  if (!corpo || typeof corpo !== "object" || !("entrada" in corpo)) return null;
  return { entrada: corpo.entrada, sha: typeof corpo.sha === "string" ? corpo.sha : null };
}
