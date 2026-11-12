import type { NextRequest } from "next/server";
import { caminhos } from "@/lib/admin/caminhos";
import { mensagemCommit } from "@/lib/admin/commit";
import { lerCorpoJogo } from "@/lib/admin/corpoJogo";
import { TIPOS_DESENHO } from "@/lib/admin/formularioJogo";
import { publicarJogo } from "@/lib/admin/publicarJogo";
import { apagarArquivos, lerArquivo } from "@/lib/admin/repositorio";
import { comSessao, pedidoIncompleto, respostaErro } from "@/lib/admin/servidor";
import { PADRAO_ANO, PADRAO_SLUG } from "@/lib/esquema";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string; slug: string }> };

const naoEncontrado = () => respostaErro("Jogo não encontrado.", 404);

/**
 * Publica a edição de um jogo existente. Se o slug mudou no formulário, a ficha e
 * os desenhos vão para o endereço novo no mesmo commit.
 */
export async function PUT(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const { ano, slug } = await params;
    if (!PADRAO_ANO.test(ano) || !PADRAO_SLUG.test(slug)) return naoEncontrado();
    const corpo = await lerCorpoJogo(req, { exigirSha: true });
    if (!corpo) return pedidoIncompleto();
    return publicarJogo({ ...corpo, ano, slugOriginal: slug, autor: sessao.nome });
  });
}

/**
 * Exclui a ficha do jogo e os três desenhos, num único commit. O corpo traz o sha
 * da ficha que a pessoa via no painel: se alguém salvou depois, a exclusão é
 * recusada para não apagar o trabalho da outra pessoa.
 */
export async function DELETE(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const { ano, slug } = await params;
    if (!PADRAO_ANO.test(ano) || !PADRAO_SLUG.test(slug)) return naoEncontrado();
    const corpo = (await req.json().catch(() => null)) as { sha?: unknown } | null;
    if (typeof corpo?.sha !== "string" || !corpo.sha) return respostaErro("Recarregue o painel e tente excluir de novo.", 400);

    const ficha = caminhos.jogo(ano, slug);
    if (!(await lerArquivo(ficha))) return respostaErro("Este jogo já tinha sido excluído. Recarregue o painel.", 404);
    await apagarArquivos(
      [ficha, ...TIPOS_DESENHO.map((tipo) => caminhos.desenho(ano, slug, tipo))],
      mensagemCommit(ano, "exclui", slug, sessao.nome),
      [{ caminho: ficha, sha: corpo.sha }],
    );
    return {};
  });
}
