import type { NextRequest } from "next/server";
import { lerCorpoMentor } from "@/lib/admin/corpoMentor";
import { publicarMentor, reordenarMentores } from "@/lib/admin/publicarMentor";
import { comSessao, pedidoIncompleto } from "@/lib/admin/servidor";

export const runtime = "nodejs";

/** Adiciona um mentor (com foto opcional). */
export async function POST(req: NextRequest) {
  return comSessao(req, async (sessao) => {
    const corpo = await lerCorpoMentor(req);
    if (!corpo) return pedidoIncompleto();
    return publicarMentor({ ...corpo, slugOriginal: null, autor: sessao.nome });
  });
}

/** Reordena a lista. Corpo: { ordem: slugs[], sha }. */
export async function PUT(req: NextRequest) {
  return comSessao(req, async (sessao) => {
    const corpo = (await req.json().catch(() => null)) as { ordem?: unknown; sha?: unknown } | null;
    const ordem = Array.isArray(corpo?.ordem) ? corpo.ordem.filter((s): s is string => typeof s === "string") : null;
    if (!ordem || typeof corpo?.sha !== "string") return pedidoIncompleto();
    return reordenarMentores(ordem, corpo.sha, sessao.nome);
  });
}
