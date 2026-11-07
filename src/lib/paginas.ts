import type { EdicaoCompleta } from "./conteudo.ts";
import type { Mentor, Tema } from "./esquema.ts";
import { contar } from "./formato.ts";

/** Os tipos de página dupla do livro. Cada tela nova acrescenta um aqui. */
type Tela =
  | { kind: "cover" | "save" | "intro" | "toc"; label: string }
  | { kind: "mentors" | "mentorsCont"; label: string; esquerda: Mentor[]; direita: Mentor[] };

export type PaginaLivro = Tela & { idx: number };

/** Um jogo no sumário. */
export type Fase = {
  /** Mundo (posição da turma na edição) e posição do jogo nele, como "3-1". */
  fase: string;
  slug: string;
  nome: string;
  turma: string;
  tema: Tema;
};

export type SlotSave = {
  ano: number;
  titulo: string;
  info: string;
  /** "atual" é a edição aberta; "outra" leva a outra edição; "vazio" ainda não tem jogos. */
  estado: "atual" | "outra" | "vazio";
};

/** Dados e ações compartilhados pelas telas. As ações chegam com o folhear. */
export type ContextoLivro = {
  edicao: EdicaoCompleta;
  saves: SlotSave[];
  goSave?: () => void;
  goToc?: () => void;
  goIntro?: () => void;
};

const MINIMO_DE_SLOTS = 3;

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

export function montarFases(edicao: EdicaoCompleta): Fase[] {
  return edicao.turmas.flatMap((turma, mundo) =>
    edicao.jogos
      .filter((jogo) => jogo.turma === turma.id)
      .map((jogo, posicao) => ({
        fase: `${mundo + 1}-${posicao + 1}`,
        slug: jogo.slug,
        nome: jogo.nome,
        turma: jogo.turma,
        tema: jogo.tema,
      })),
  );
}

const MENTORES_POR_PAGINA = 2;

/** Líderes na primeira página; os demais, em duplas, continuam em quantas páginas forem precisas. */
function telasDeMentores(mentores: Mentor[]): Tela[] {
  const professores = mentores.filter((m) => !m.lider);
  const paginas = [mentores.filter((m) => m.lider)];
  for (let i = 0; i < professores.length; i += MENTORES_POR_PAGINA) {
    paginas.push(professores.slice(i, i + MENTORES_POR_PAGINA));
  }

  const telas: Tela[] = [];
  for (let i = 0; i < paginas.length; i += 2) {
    telas.push({
      kind: i === 0 ? "mentors" : "mentorsCont",
      label: i === 0 ? "Seu time de mentores" : "Seu time de mentores, continuação",
      esquerda: paginas[i],
      direita: paginas[i + 1] ?? [],
    });
  }
  return telas;
}

export function montarPaginas(_edicao: EdicaoCompleta, mentores: Mentor[]): PaginaLivro[] {
  const telas: Tela[] = [
    { kind: "cover", label: "Capa" },
    { kind: "save", label: "Seleção de edição" },
    { kind: "intro", label: "Abertura" },
    { kind: "toc", label: "Sumário: seleção de fases" },
    ...telasDeMentores(mentores),
  ];
  return telas.map((tela, idx) => ({ ...tela, idx }));
}
