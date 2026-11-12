import type { NextRequest } from "next/server";
import { publicarEdicao } from "@/lib/admin/publicarEdicao";
import { comSessao, lerEntradaEArquivos, pedidoIncompleto } from "@/lib/admin/servidor";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string }> };

/** Publica os dados da edição (título, textos, turmas e créditos). Corpo: { entrada, sha }. */
export async function PUT(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const corpo = await lerEntradaEArquivos(req);
    if (!corpo?.sha) return pedidoIncompleto();
    return publicarEdicao((await params).ano, corpo.entrada, corpo.sha, sessao.nome);
  });
}
