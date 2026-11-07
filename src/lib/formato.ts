/** Funções de texto usadas no servidor e no cliente: este módulo não importa nada. */

export function doisDigitos(numero: number) {
  return String(numero).padStart(2, "0");
}

export function contar(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}
