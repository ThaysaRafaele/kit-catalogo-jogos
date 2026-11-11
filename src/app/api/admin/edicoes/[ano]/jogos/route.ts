import { NextResponse, type NextRequest } from "next/server";
import { lerCorpo, responderPublicacao } from "@/lib/admin/respostaPublicacao";
import { exigirSessao, respostaErro } from "@/lib/admin/servidor";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string }> };

/** Publica um jogo novo. */
export async function POST(req: NextRequest, { params }: Contexto) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;

  const corpo = await lerCorpo(req);
  if (!corpo) return respostaErro("Pedido sem a ficha do jogo.", 400);

  const { ano } = await params;
  return responderPublicacao(
    { ano, entrada: corpo.entrada, slugOriginal: null, sha: null, autor: sessao.nome },
    corpo.arquivos,
  );
}
