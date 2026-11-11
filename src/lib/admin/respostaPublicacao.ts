/** Resposta das rotas de publicação do jogo (POST de jogo novo e PUT de jogo existente). */
import { NextResponse } from "next/server";
import { NOMES_DESENHO, TIPOS_DESENHO, type TipoDesenho } from "./formularioJogo.ts";
import { ImagemInvalidaError, processarImagem } from "./imagem.ts";
import { publicarJogo, ValidacaoError, type PedidoPublicacao } from "./publicarJogo.ts";
import { respostaDeFalha, respostaErro } from "./servidor.ts";

export type CorpoPublicacao = {
  entrada: unknown;
  sha: string | null;
  /** Arquivos dos desenhos novos, como vieram (ainda não conferidos). */
  arquivos: Partial<Record<TipoDesenho, Buffer>>;
};

/** Converte os erros da publicação numa resposta para o formulário. */
export function respostaDeErroDaPublicacao(erro: unknown) {
  if (erro instanceof ValidacaoError) {
    return NextResponse.json({ erro: erro.message, erros: erro.erros }, { status: 422 });
  }
  if (erro instanceof ImagemInvalidaError) return respostaErro(erro.message, 400);
  return respostaDeFalha(erro);
}

export async function responderPublicacao(pedido: Omit<PedidoPublicacao, "desenhos">, arquivos: CorpoPublicacao["arquivos"]) {
  try {
    // Cada desenho é conferido e reconvertido (em paralelo) antes de qualquer gravação.
    const presentes = TIPOS_DESENHO.filter((tipo) => arquivos[tipo]);
    const convertidos = await Promise.all(
      presentes.map(async (tipo) => {
        try {
          return [tipo, await processarImagem(arquivos[tipo]!)] as const;
        } catch (erro) {
          if (erro instanceof ImagemInvalidaError) {
            throw new ImagemInvalidaError(`${NOMES_DESENHO[tipo]}: ${erro.message}`);
          }
          throw erro;
        }
      }),
    );
    const desenhos: PedidoPublicacao["desenhos"] = Object.fromEntries(convertidos);
    const resultado = await publicarJogo({ ...pedido, desenhos });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    return respostaDeErroDaPublicacao(erro);
  }
}

/**
 * Corpo esperado: JSON { entrada, sha }, ou multipart com o campo "dados" (o mesmo
 * JSON) e um arquivo por desenho novo: "desenho-protagonista", "desenho-antagonista",
 * "desenho-mundo".
 */
export async function lerCorpo(req: Request): Promise<CorpoPublicacao | null> {
  const tipo = req.headers.get("content-type") ?? "";
  let dados: unknown;
  const arquivos: CorpoPublicacao["arquivos"] = {};

  if (tipo.startsWith("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    try {
      dados = JSON.parse(String(form.get("dados") ?? ""));
    } catch {
      return null;
    }
    for (const desenho of TIPOS_DESENHO) {
      const arquivo = form.get(`desenho-${desenho}`);
      if (arquivo instanceof File && arquivo.size > 0) arquivos[desenho] = Buffer.from(await arquivo.arrayBuffer());
    }
  } else {
    dados = await req.json().catch(() => null);
  }

  if (!dados || typeof dados !== "object" || !("entrada" in dados)) return null;
  const { entrada, sha } = dados as { entrada: unknown; sha?: unknown };
  return { entrada, sha: typeof sha === "string" ? sha : null, arquivos };
}
