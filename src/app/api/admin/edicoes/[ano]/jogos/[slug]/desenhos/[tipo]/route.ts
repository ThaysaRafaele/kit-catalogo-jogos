import type { NextRequest } from "next/server";
import { TIPOS_DESENHO, type TipoDesenho } from "@/lib/admin/formularioJogo";
import { processarImagem } from "@/lib/admin/imagem";
import { enviarDesenho } from "@/lib/admin/publicarJogo";
import { comSessao, respostaErro } from "@/lib/admin/servidor";
import { PADRAO_ANO, PADRAO_SLUG } from "@/lib/esquema";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ ano: string; slug: string; tipo: string }> };

/**
 * Envia um desenho sozinho (multipart, campo "arquivo"). O formulário usa esta rota
 * quando os desenhos juntos passariam de 4 MB numa requisição só.
 */
export async function PUT(req: NextRequest, { params }: Contexto) {
  return comSessao(req, async (sessao) => {
    const { ano, slug, tipo } = await params;
    if (!PADRAO_ANO.test(ano) || !PADRAO_SLUG.test(slug) || !TIPOS_DESENHO.includes(tipo as TipoDesenho)) {
      return respostaErro("Desenho não encontrado.", 404);
    }
    const arquivo = (await req.formData().catch(() => null))?.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) return respostaErro("Pedido sem o arquivo do desenho.", 400);

    const dados = await processarImagem(Buffer.from(await arquivo.arrayBuffer()));
    return enviarDesenho(ano, slug, tipo as TipoDesenho, dados, sessao.nome);
  });
}
