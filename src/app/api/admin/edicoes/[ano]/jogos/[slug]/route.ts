import { NextResponse, type NextRequest } from "next/server";
import { caminhos } from "@/lib/admin/caminhos";
import { mensagemCommit } from "@/lib/admin/commit";
import { apagarArquivos, lerArquivo } from "@/lib/admin/repositorio";
import { exigirSessao, respostaDeFalha, respostaErro } from "@/lib/admin/servidor";
import { PADRAO_ANO, PADRAO_SLUG } from "@/lib/esquema";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string; slug: string }> };

/**
 * Exclui a ficha do jogo e os três desenhos, num único commit. O corpo traz o sha
 * da ficha que a pessoa via no painel: se alguém salvou depois, a exclusão é
 * recusada para não apagar o trabalho da outra pessoa.
 */
export async function DELETE(req: NextRequest, { params }: Contexto) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;

  const { ano, slug } = await params;
  if (!PADRAO_ANO.test(ano) || !PADRAO_SLUG.test(slug)) return respostaErro("Jogo não encontrado.", 404);

  const corpo = (await req.json().catch(() => null)) as { sha?: unknown } | null;
  if (typeof corpo?.sha !== "string" || !corpo.sha) {
    return respostaErro("Recarregue o painel e tente excluir de novo.", 400);
  }

  try {
    const ficha = caminhos.jogo(ano, slug);
    if (!(await lerArquivo(ficha))) {
      return respostaErro("Este jogo já tinha sido excluído. Recarregue o painel.", 404);
    }
    await apagarArquivos(
      [
        ficha,
        caminhos.desenho(ano, slug, "protagonista"),
        caminhos.desenho(ano, slug, "antagonista"),
        caminhos.desenho(ano, slug, "mundo"),
      ],
      mensagemCommit(ano, "exclui", slug, sessao.nome),
      [{ caminho: ficha, sha: corpo.sha }],
    );
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return respostaDeFalha(erro);
  }
}
