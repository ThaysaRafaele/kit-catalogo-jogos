import type { EdicaoCompleta } from "./conteudo.ts";
import type { Edicao, Jogo, Mentor, Tema } from "./esquema.ts";
import { ancoraDoJogo, contar } from "./formato.ts";

/** Os tipos de página dupla do livro. Cada tela nova acrescenta um aqui. */
type Tela =
  | { kind: "cover" | "save" | "intro" | "toc"; label: string }
  | { kind: "mentors" | "mentorsCont"; label: string; esquerda: Mentor[]; direita: Mentor[] }
  | TelaTurma
  | TelaJogo;

/** Uma turma e seus jogos. O número do mundo é a posição da turma na edição. */
type Mundo = { turma: Edicao["turmas"][number]; mundo: number; itens: { jogo: Jogo; fase: string }[] };

export type TelaTurma = {
  kind: "turma";
  label: string;
  turma: Mundo["turma"];
  mundo: number;
  fases: Fase[];
};

export type TelaJogo = { label: string; jogo: Jogo; fase: string } & (
  | {
      kind: "gameA";
      /** Destino dos links das fases no sumário e na abertura da turma. */
      ancora: string;
    }
  | { kind: "gameB" }
);

export type PaginaLivro = Tela & { idx: number };

/** Um jogo no sumário e na abertura da turma. */
export type Fase = {
  /** Mundo e posição do jogo nele, como "3-1". */
  fase: string;
  slug: string;
  nome: string;
  estudio: string;
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

function montarMundos(edicao: EdicaoCompleta): Mundo[] {
  return edicao.turmas.map((turma, i) => ({
    turma,
    mundo: i + 1,
    itens: edicao.jogos
      .filter((jogo) => jogo.turma === turma.id)
      .map((jogo, posicao) => ({ jogo, fase: `${i + 1}-${posicao + 1}` })),
  }));
}

/** Só os campos que o sumário e a abertura da turma usam. */
function paraFase({ jogo, fase }: Mundo["itens"][number]): Fase {
  const { slug, nome, estudio, turma, tema } = jogo;
  return { fase, slug, nome, estudio, turma, tema };
}

export function montarFases(edicao: EdicaoCompleta): Fase[] {
  return montarMundos(edicao).flatMap((mundo) => mundo.itens.map(paraFase));
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

/** Uma abertura por turma com jogos, seguida das páginas de cada jogo. */
function telasDeTurmas(edicao: EdicaoCompleta): Tela[] {
  return montarMundos(edicao)
    .filter(({ itens }) => itens.length > 0)
    .flatMap(({ turma, mundo, itens }): Tela[] => [
      {
        kind: "turma",
        label: `Abertura da turma ${turma.id}`,
        turma,
        mundo,
        fases: itens.map(paraFase),
      },
      ...itens.flatMap(({ jogo, fase }): Tela[] => [
        {
          kind: "gameA",
          label: `${jogo.nome}: apresentação e personagens`,
          jogo,
          fase,
          ancora: ancoraDoJogo(jogo.slug),
        },
        { kind: "gameB", label: `${jogo.nome}: mundo, controles e equipe`, jogo, fase },
      ]),
    ]);
}

export function montarPaginas(edicao: EdicaoCompleta, mentores: Mentor[]): PaginaLivro[] {
  const telas: Tela[] = [
    { kind: "cover", label: "Capa" },
    { kind: "save", label: "Seleção de edição" },
    { kind: "intro", label: "Abertura" },
    { kind: "toc", label: "Sumário: seleção de fases" },
    ...telasDeMentores(mentores),
    ...telasDeTurmas(edicao),
  ];
  return telas.map((tela, idx) => ({ ...tela, idx }));
}
