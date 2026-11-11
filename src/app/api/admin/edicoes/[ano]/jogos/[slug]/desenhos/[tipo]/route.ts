import { NextResponse, type NextRequest } from "next/server";
import { TIPOS_DESENHO, type TipoDesenho } from "@/lib/admin/formularioJogo";
import { processarImagem } from "@/lib/admin/imagem";
import { enviarDesenho } from "@/lib/admin/publicarJogo";
import { respostaDeErroDaPublicacao } from "@/lib/admin/respostaPublicacao";
import { exigirSessao, respostaErro } from "@/lib/admin/servidor";
import { PADRAO_ANO, PADRAO_SLUG } from "@/lib/esquema";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string; slug: string; tipo: string }> };

/**
 * Envia um desenho sozinho (multipart, campo "arquivo"). O formulário usa esta rota
 * quando os desenhos juntos passariam de 4 MB numa requisição só.
 */
export async function PUT(req: NextRequest, { params }: Contexto) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;

  const { ano, slug, tipo } = await params;
  if (!PADRAO_ANO.test(ano) || !PADRAO_SLUG.test(slug) || !TIPOS_DESENHO.includes(tipo as TipoDesenho)) {
    return respostaErro("Desenho não encontrado.", 404);
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return respostaErro("Pedido sem o arquivo do desenho.", 400);

  try {
    const dados = await processarImagem(Buffer.from(await arquivo.arrayBuffer()));
    const { commitUrl } = await enviarDesenho(ano, slug, tipo as TipoDesenho, dados, sessao.nome);
    return NextResponse.json({ ok: true, commitUrl });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}
