/** Funções de texto usadas no servidor e no cliente: este módulo não importa nada. */

export function doisDigitos(numero: number) {
  return String(numero).padStart(2, "0");
}

/** Id da página de um jogo, com prefixo para não colidir com outros ids do documento. */
export function ancoraDoJogo(slug: string) {
  return `jogo-${slug}`;
}

/** Junta as partes preenchidas com o separador do livro. */
export function juntar(...partes: string[]) {
  return partes.filter(Boolean).join(" • ");
}

export function contar(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}
