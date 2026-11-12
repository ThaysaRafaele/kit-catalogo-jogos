import type { NextRequest } from "next/server";
import { lerCorpoJogo } from "@/lib/admin/corpoJogo";
import { publicarJogo } from "@/lib/admin/publicarJogo";
import { comSessao, pedidoIncompleto } from "@/lib/admin/servidor";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string }> };

/** Publica um jogo novo (com os desenhos, se vierem no multipart). */
export async function POST(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const corpo = await lerCorpoJogo(req, { exigirSha: false });
    if (!corpo) return pedidoIncompleto();
    const { ano } = await params;
    return publicarJogo({ ...corpo, ano, slugOriginal: null, sha: null, autor: sessao.nome });
  });
}
