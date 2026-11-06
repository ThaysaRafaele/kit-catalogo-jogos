import type { EdicaoCompleta } from "./conteudo.ts";

/** Os tipos de página dupla do livro. Cada tela nova acrescenta um aqui. */
type Tela = { kind: "cover" | "save"; label: string };

export type PaginaLivro = Tela & { idx: number };

export type SlotSave = {
  ano: number;
  titulo: string;
  info: string;
  /** "atual" é a edição aberta; "outra" leva a outra edição; "vazio" ainda não tem jogos. */
  estado: "atual" | "outra" | "vazio";
};

/** Dados e ações compartilhados pelas telas. As ações chegam com o folhear. */
export type ContextoLivro = {
  ano: number;
  saves: SlotSave[];
  goSave?: () => void;
  goToc?: () => void;
  goIntro?: () => void;
};

const MINIMO_DE_SLOTS = 3;

export function doisDigitos(numero: number) {
  return String(numero).padStart(2, "0");
}

function contar(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** Um slot por pasta de edição, seguidos de pelo menos um slot vazio para os próximos anos. */
export function montarSaves(edicoes: EdicaoCompleta[], anoAtual: number): SlotSave[] {
  const total = Math.max(MINIMO_DE_SLOTS, edicoes.length + 1);
  const ultimoAno = edicoes.at(-1)!.ano;

  return Array.from({ length: total }, (_, i): SlotSave => {
    const edicao = edicoes[i];
    if (!edicao || (edicao.ano !== anoAtual && edicao.jogos.length === 0)) {
      return {
        ano: edicao?.ano ?? ultimoAno + i - edicoes.length + 1,
        titulo: "Slot vazio",
        info: "Nova aventura em breve",
        estado: "vazio",
      };
    }
    return {
      ano: edicao.ano,
      titulo: edicao.titulo,
      info: `${contar(edicao.jogos.length, "jogo", "jogos")} • ${contar(edicao.turmas.length, "turma", "turmas")}`,
      estado: edicao.ano === anoAtual ? "atual" : "outra",
    };
  });
}

export function montarPaginas(_edicao: EdicaoCompleta): PaginaLivro[] {
  const telas: Tela[] = [
    { kind: "cover", label: "Capa" },
    { kind: "save", label: "Seleção de edição" },
  ];
  return telas.map((tela, idx) => ({ ...tela, idx }));
}
