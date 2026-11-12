/**
 * Regras de onde o admin pode escrever. Toda gravação, no GitHub ou no disco,
 * passa por validarCaminho antes: é a última barreira contra "../" e afins.
 */
import type { TipoDesenho } from "./formularioJogo.ts";

/** Pastas liberadas e a extensão aceita em cada uma. */
const AREAS: { prefixo: string; extensao: RegExp }[] = [
  { prefixo: "content/", extensao: /\.json$/ },
  { prefixo: "public/edicoes/", extensao: /\.webp$/ },
  { prefixo: "public/mentores/", extensao: /\.webp$/ },
];

/** Cada parte: letras minúsculas, números, hífens e pontos, começando por letra ou número. */
const PARTE_VALIDA = /^[a-z0-9][a-z0-9._-]*$/;

export class CaminhoInvalidoError extends Error {
  constructor(caminho: string, motivo: string) {
    super(`Caminho recusado (${motivo}): ${caminho}`);
    this.name = "CaminhoInvalidoError";
  }
}

/** Devolve o caminho normalizado ou lança CaminhoInvalidoError. */
export function validarCaminho(caminho: string): string {
  if (typeof caminho !== "string" || caminho.length === 0) {
    throw new CaminhoInvalidoError(String(caminho), "vazio");
  }
  if (caminho.includes("\\") || caminho.includes("\0")) {
    throw new CaminhoInvalidoError(caminho, "caractere proibido");
  }
  if (caminho.startsWith("/") || /^[a-z]:/i.test(caminho)) {
    throw new CaminhoInvalidoError(caminho, "caminho absoluto");
  }
  const partes = caminho.split("/");
  if (partes.some((p) => p === "" || p === "." || p === "..")) {
    throw new CaminhoInvalidoError(caminho, "trecho inválido");
  }
  if (!partes.every((p) => PARTE_VALIDA.test(p))) {
    throw new CaminhoInvalidoError(caminho, "nome com caractere não permitido");
  }
  const area = AREAS.find((a) => caminho.startsWith(a.prefixo));
  if (!area) throw new CaminhoInvalidoError(caminho, "fora das pastas liberadas");
  if (!area.extensao.test(caminho)) throw new CaminhoInvalidoError(caminho, "extensão não permitida");
  return caminho;
}

/** Para leitura e listagem: mesma regra de pasta, sem exigir extensão. */
export function validarPasta(pasta: string): string {
  const semBarra = pasta.replace(/\/+$/, "");
  if (semBarra.includes("\\") || semBarra.startsWith("/") || /^[a-z]:/i.test(semBarra)) {
    throw new CaminhoInvalidoError(pasta, "caminho absoluto ou com barra invertida");
  }
  const partes = semBarra.split("/");
  if (partes.some((p) => p === "" || p === "." || p === ".." || !PARTE_VALIDA.test(p))) {
    throw new CaminhoInvalidoError(pasta, "trecho inválido");
  }
  const comBarra = `${semBarra}/`;
  const permitida = AREAS.some((a) => comBarra.startsWith(a.prefixo) || a.prefixo.startsWith(comBarra));
  if (!permitida) throw new CaminhoInvalidoError(pasta, "fora das pastas liberadas");
  return semBarra;
}

/** Caminhos fixos dos arquivos, para ninguém montar string na mão. */
export const caminhos = {
  edicao: (ano: number | string) => `content/edicoes/${ano}/edicao.json`,
  pastaJogos: (ano: number | string) => `content/edicoes/${ano}/jogos`,
  jogo: (ano: number | string, slug: string) => `content/edicoes/${ano}/jogos/${slug}.json`,
  pastaDesenhos: (ano: number | string) => `public/edicoes/${ano}`,
  desenho: (ano: number | string, slug: string, tipo: TipoDesenho) => `public/edicoes/${ano}/${slug}/${tipo}.webp`,
  mentores: () => "content/mentores.json",
  pastaFotos: () => "public/mentores",
  fotoMentor: (slugNome: string) => `public/mentores/${slugNome}.webp`,
};

/** Caminho no repositório → endereço no site: "public/mentores/x.webp" → "/mentores/x.webp". */
export const paraSrc = (caminho: string) => caminho.replace(/^public/, "");
