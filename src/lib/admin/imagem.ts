/**
 * Conferência e conversão das imagens no servidor. O navegador já manda WebP
 * reduzido, mas o servidor não confia: confere o tipo real pelos primeiros bytes
 * (não pela extensão), o tamanho, e reconverte com o sharp. A reconversão também
 * tira os metadados, como o EXIF com a localização das fotos de celular.
 */
import sharp from "sharp";

/** Abaixo do limite de 4,5 MB por requisição das funções da Vercel. */
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;
/** Maior lado dos desenhos depois da conversão. */
export const LADO_MAXIMO = 1600;

export class ImagemInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ImagemInvalidaError";
  }
}

type TipoImagem = "jpeg" | "png" | "webp";

/** Tipo real do arquivo pelos "números mágicos" do início. */
export function detectarTipo(dados: Buffer): TipoImagem | null {
  if (dados.length >= 3 && dados[0] === 0xff && dados[1] === 0xd8 && dados[2] === 0xff) return "jpeg";
  if (dados.length >= 8 && dados.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (dados.length >= 12 && dados.toString("ascii", 0, 4) === "RIFF" && dados.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
}

/** Confere e converte para WebP (no máximo `ladoMaximo` px no maior lado, qualidade 85). */
export async function processarImagem(dados: Buffer, ladoMaximo = LADO_MAXIMO): Promise<Buffer> {
  if (dados.length === 0) throw new ImagemInvalidaError("O arquivo da imagem veio vazio.");
  if (dados.length > TAMANHO_MAXIMO) {
    throw new ImagemInvalidaError("A imagem passou de 4 MB. Escolha um arquivo menor.");
  }
  if (!detectarTipo(dados)) {
    throw new ImagemInvalidaError("O arquivo não é uma imagem JPG, PNG ou WebP.");
  }
  try {
    return await sharp(dados, { limitInputPixels: 50_000_000 })
      // Aplica a rotação do EXIF antes de descartar os metadados (foto de celular "deitada").
      .rotate()
      .resize({ width: ladoMaximo, height: ladoMaximo, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ImagemInvalidaError("Não foi possível ler a imagem. O arquivo pode estar corrompido.");
  }
}
