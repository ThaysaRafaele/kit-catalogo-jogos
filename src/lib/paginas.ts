import type { EdicaoCompleta } from "./conteudo.ts";

/** Os tipos de página dupla do livro. Cada tela nova acrescenta um aqui. */
type Tela = { kind: "cover"; label: string };

export type PaginaLivro = Tela & { idx: number };

/** Dados e ações compartilhados pelas telas. As ações chegam com o folhear. */
export type ContextoLivro = {
  ano: number;
  goSave?: () => void;
  goToc?: () => void;
  goIntro?: () => void;
};

export function montarPaginas(_edicao: EdicaoCompleta): PaginaLivro[] {
  const telas: Tela[] = [{ kind: "cover", label: "Capa" }];
  return telas.map((tela, idx) => ({ ...tela, idx }));
}
