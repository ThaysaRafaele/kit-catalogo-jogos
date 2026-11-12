/** Corpo das rotas de mentor: o pedido é conferido antes, e só então a foto passa pelo sharp. */
import { ImagemInvalidaError, processarFoto } from "./imagem.ts";
import { lerEntradaEArquivos } from "./servidor.ts";

export async function lerCorpoMentor(req: Request) {
  const corpo = await lerEntradaEArquivos(req, ["foto"]);
  if (!corpo || !corpo.sha) return null;
  let foto: Buffer | undefined;
  if (corpo.arquivos.foto) {
    try {
      foto = await processarFoto(corpo.arquivos.foto);
    } catch (erro) {
      if (erro instanceof ImagemInvalidaError) throw new ImagemInvalidaError(`Foto: ${erro.message}`);
      throw erro;
    }
  }
  return { entrada: corpo.entrada, sha: corpo.sha, foto };
}
