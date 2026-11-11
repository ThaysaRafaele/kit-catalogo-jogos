import { NextResponse, type NextRequest } from "next/server";
import { lerCorpoMentor } from "@/lib/admin/corpoMentor";
import { excluirMentor, publicarMentor } from "@/lib/admin/publicarMentor";
import { respostaDeErroDaPublicacao } from "@/lib/admin/respostaPublicacao";
import { exigirSessao, respostaErro } from "@/lib/admin/servidor";
import { PADRAO_SLUG } from "@/lib/esquema";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ slug: string }> };

/** Edita um mentor. Se o nome mudar, a foto vai junto para o nome novo. */
export async function PUT(req: NextRequest, { params }: Contexto) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;
  const { slug } = await params;
  if (!PADRAO_SLUG.test(slug)) return respostaErro("Mentor não encontrado.", 404);
  try {
    const corpo = await lerCorpoMentor(req);
    if (!corpo) return respostaErro("Recarregue a página e tente publicar de novo.", 400);
    const resultado = await publicarMentor({ ...corpo, slugOriginal: slug, autor: sessao.nome });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}

/** Exclui o mentor e a foto. Corpo: { sha }. */
export async function DELETE(req: NextRequest, { params }: Contexto) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;
  const { slug } = await params;
  if (!PADRAO_SLUG.test(slug)) return respostaErro("Mentor não encontrado.", 404);
  const corpo = (await req.json().catch(() => null)) as { sha?: unknown } | null;
  if (typeof corpo?.sha !== "string") return respostaErro("Recarregue a página e tente excluir de novo.", 400);
  try {
    return NextResponse.json({ ok: true, ...(await excluirMentor(slug, corpo.sha, sessao.nome)) });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}
