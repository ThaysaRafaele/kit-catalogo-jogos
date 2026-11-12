/**
 * Preparação dos desenhos no navegador, antes do envio: reduz para no máximo
 * 1600 px no maior lado e converte para WebP (qualidade 0,85). Assim a foto de
 * 8 MB do celular vira algumas centenas de KB e cabe no limite de uma requisição.
 */

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
export const ACEITAR = TIPOS_ACEITOS.join(",");
const LADO_MAXIMO = 1600;
const QUALIDADE = 0.85;
/** Margem abaixo dos 4 MB por requisição, contando a ficha e o envelope do envio. */
export const LIMITE_POR_REQUISICAO = 3.5 * 1024 * 1024;
/** O mesmo limite por arquivo do servidor (imagem.ts). */
const TAMANHO_MAXIMO = 4 * 1024 * 1024;
/** Cabeçalhos de cada parte do multipart (nome do campo, nome do arquivo, tipo). */
export const ENVELOPE_POR_PARTE = 512;

export type ImagemPreparada = { blob: Blob; largura: number; altura: number };

/**
 * "Clarear fundo do papel": estica os níveis para o cinza do scan virar branco e o
 * traço ficar mais escuro. Mexe pixel a pixel (o ctx.filter não funciona em todo navegador).
 */
function clarearFundo(ctx: CanvasRenderingContext2D, largura: number, altura: number) {
  const PRETO = 25;
  const BRANCO = 205;
  const tabela = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) tabela[v] = ((v - PRETO) * 255) / (BRANCO - PRETO);

  const imagem = ctx.getImageData(0, 0, largura, altura);
  const d = imagem.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = tabela[d[i]];
    d[i + 1] = tabela[d[i + 1]];
    d[i + 2] = tabela[d[i + 2]];
  }
  ctx.putImageData(imagem, 0, 0);
}

export async function prepararImagem(arquivo: File, clarear: boolean): Promise<ImagemPreparada> {
  if (arquivo.type && !TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new Error("Escolha um arquivo JPG, PNG ou WebP.");
  }

  let bitmap: ImageBitmap;
  try {
    // "from-image" respeita a rotação da foto de celular.
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível abrir a imagem. Confira se o arquivo é mesmo JPG, PNG ou WebP.");
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não conseguiu preparar a imagem.");
  ctx.imageSmoothingQuality = "high";
  // Fundo branco: PNG com transparência não vira preto no WebP.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  if (clarear) clarearFundo(ctx, largura, altura);

  const converter = (tipo: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, QUALIDADE));
  let blob = await converter("image/webp");
  // Navegador sem WebP devolve PNG, que pode passar de vários MB. JPEG todo
  // navegador gera, e o servidor converte para WebP de qualquer jeito.
  if (blob && blob.type !== "image/webp") blob = await converter("image/jpeg");
  if (!blob) throw new Error("Este navegador não conseguiu converter a imagem.");
  if (blob.size > TAMANHO_MAXIMO) {
    throw new Error(
      `Mesmo reduzida, a imagem ficou com ${tamanhoLegivel(blob.size)}, e o limite é 4 MB. Tente outro arquivo.`,
    );
  }
  return { blob, largura, altura };
}

export function tamanhoLegivel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
