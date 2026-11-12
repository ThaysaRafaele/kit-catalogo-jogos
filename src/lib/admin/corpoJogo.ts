/**
 * Corpo das rotas que publicam um jogo: { entrada, sha } e, no multipart, um
 * arquivo por desenho novo ("desenho-protagonista", "desenho-antagonista",
 * "desenho-mundo"). O pedido é conferido antes; só então os desenhos passam pelo sharp.
 */
import { NOMES_DESENHO, TIPOS_DESENHO, type TipoDesenho } from "./formularioJogo.ts";
import { ImagemInvalidaError, processarImagem } from "./imagem.ts";
import { lerEntradaEArquivos } from "./servidor.ts";

export async function lerCorpoJogo(req: Request, { exigirSha }: { exigirSha: boolean }) {
  const corpo = await lerEntradaEArquivos(req, TIPOS_DESENHO.map((tipo) => `desenho-${tipo}`));
  if (!corpo || (exigirSha && !corpo.sha)) return null;

  // Cada desenho é conferido e reconvertido (em paralelo) antes de qualquer gravação.
  const convertidos = await Promise.all(
    TIPOS_DESENHO.filter((tipo) => corpo.arquivos[`desenho-${tipo}`]).map(async (tipo) => {
      try {
        return [tipo, await processarImagem(corpo.arquivos[`desenho-${tipo}`])] as const;
      } catch (erro) {
        if (erro instanceof ImagemInvalidaError) throw new ImagemInvalidaError(`${NOMES_DESENHO[tipo]}: ${erro.message}`);
        throw erro;
      }
    }),
  );
  const desenhos: Partial<Record<TipoDesenho, Buffer>> = Object.fromEntries(convertidos);
  return { entrada: corpo.entrada, sha: corpo.sha, desenhos };
}
