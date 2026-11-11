import { NextResponse, type NextRequest } from "next/server";
import { lerCorpoMentor } from "@/lib/admin/corpoMentor";
import { publicarMentor, reordenarMentores } from "@/lib/admin/publicarMentor";
import { respostaDeErroDaPublicacao } from "@/lib/admin/respostaPublicacao";
import { exigirSessao, respostaErro } from "@/lib/admin/servidor";

export const runtime = "nodejs";

/** Adiciona um mentor (com foto opcional). */
export async function POST(req: NextRequest) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;
  try {
    const corpo = await lerCorpoMentor(req);
    if (!corpo) return respostaErro("Recarregue a página e tente publicar de novo.", 400);
    const resultado = await publicarMentor({ ...corpo, slugOriginal: null, autor: sessao.nome });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}

/** Reordena a lista. Corpo: { ordem: slugs[], sha }. */
export async function PUT(req: NextRequest) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;
  const corpo = (await req.json().catch(() => null)) as { ordem?: unknown; sha?: unknown } | null;
  const ordem = Array.isArray(corpo?.ordem) ? corpo.ordem.filter((s): s is string => typeof s === "string") : null;
  if (!ordem || typeof corpo?.sha !== "string") return respostaErro("Recarregue a página e tente de novo.", 400);
  try {
    return NextResponse.json({ ok: true, ...(await reordenarMentores(ordem, corpo.sha, sessao.nome)) });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}
