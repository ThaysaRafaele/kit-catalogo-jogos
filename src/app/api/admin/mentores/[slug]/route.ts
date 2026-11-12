import type { NextRequest } from "next/server";
import { lerCorpoMentor } from "@/lib/admin/corpoMentor";
import { excluirMentor, publicarMentor } from "@/lib/admin/publicarMentor";
import { comSessao, pedidoIncompleto, respostaErro } from "@/lib/admin/servidor";
import { PADRAO_SLUG } from "@/lib/esquema";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ slug: string }> };

const naoEncontrado = () => respostaErro("Mentor não encontrado.", 404);

/** Edita um mentor. Se o nome mudar, a foto vai junto para o nome novo. */
export async function PUT(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const { slug } = await params;
    if (!PADRAO_SLUG.test(slug)) return naoEncontrado();
    const corpo = await lerCorpoMentor(req);
    if (!corpo) return pedidoIncompleto();
    return publicarMentor({ ...corpo, slugOriginal: slug, autor: sessao.nome });
  });
}

/** Exclui o mentor e a foto. Corpo: { sha }. */
export async function DELETE(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const { slug } = await params;
    if (!PADRAO_SLUG.test(slug)) return naoEncontrado();
    const corpo = (await req.json().catch(() => null)) as { sha?: unknown } | null;
    if (typeof corpo?.sha !== "string") return respostaErro("Recarregue a página e tente excluir de novo.", 400);
    return excluirMentor(slug, corpo.sha, sessao.nome);
  });
}
