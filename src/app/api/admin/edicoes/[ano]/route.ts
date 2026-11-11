import { NextResponse, type NextRequest } from "next/server";
import { publicarEdicao } from "@/lib/admin/publicarEdicao";
import { respostaDeErroDaPublicacao } from "@/lib/admin/respostaPublicacao";
import { exigirSessao, respostaErro } from "@/lib/admin/servidor";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string }> };

/** Publica os dados da edição (título, textos, turmas e créditos). Corpo: { entrada, sha }. */
export async function PUT(req: NextRequest, { params }: Contexto) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;

  const corpo = (await req.json().catch(() => null)) as { entrada?: unknown; sha?: unknown } | null;
  if (!corpo || !("entrada" in corpo)) return respostaErro("Pedido sem os dados da edição.", 400);
  if (typeof corpo.sha !== "string" || !corpo.sha) return respostaErro("Recarregue a página e tente publicar de novo.", 400);

  const { ano } = await params;
  try {
    const resultado = await publicarEdicao(ano, corpo.entrada, corpo.sha, sessao.nome);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}
