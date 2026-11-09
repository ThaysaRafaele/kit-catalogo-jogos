import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  edicaoSchema,
  jogoSchema,
  MARCADOR_VAZIO,
  mentoresSchema,
  type Edicao,
  type Jogo,
  type Mentor,
} from "./esquema.ts";

export type EdicaoCompleta = Edicao & { jogos: Jogo[] };

export type Conteudo = {
  /** Edições em ordem crescente de ano. */
  edicoes: EdicaoCompleta[];
  mentores: Mentor[];
  /** Pendências que não impedem o build: campo sem conteúdo ou imagem que falta. */
  avisos: string[];
};

const RAIZ = process.cwd();
const PASTA_EDICOES = path.join(RAIZ, "content", "edicoes");
/** Listas que podem ficar vazias sem que isso seja uma pendência. */
const LISTAS_OPCIONAIS = new Set(["disciplinas", "teclas"]);
const CAMINHO_DE_IMAGEM = /\.(webp|png|jpe?g|gif|svg)$/i;

/** Texto vazio, ou lista/objeto sem nenhum conteúdo dentro. */
function vazio(valor: unknown): boolean {
  if (valor === "") return true;
  return typeof valor === "object" && valor !== null && Object.values(valor).every(vazio);
}

/**
 * Prepara o JSON para a validação: apara os textos e registra um aviso para cada
 * pendência. Campo com "PREENCHER" e imagem que não existe em public/ viram texto
 * vazio, e itens sem conteúdo saem das listas. As telas não exibem o que ficou vazio.
 */
function limpar(atual: unknown, caminho: string, chave: string, avisos: string[]): unknown {
  if (typeof atual === "string") {
    const texto = atual.trim();
    if (texto.includes(MARCADOR_VAZIO)) {
      avisos.push(`${caminho}: campo a preencher`);
      return "";
    }
    if (CAMINHO_DE_IMAGEM.test(texto) && !existsSync(path.join(RAIZ, "public", texto))) {
      avisos.push(`${caminho}: imagem não encontrada (${texto}), usando placeholder`);
      return "";
    }
    return texto;
  }
  if (Array.isArray(atual)) {
    if (atual.length === 0 && !LISTAS_OPCIONAIS.has(chave)) {
      avisos.push(`${caminho}: lista vazia`);
    }
    return atual
      .map((item, i) => limpar(item, `${caminho}[${item?.nome ?? i}]`, chave, avisos))
      .filter((item) => !vazio(item));
  }
  if (atual !== null && typeof atual === "object") {
    return Object.fromEntries(
      Object.entries(atual).map(([k, v]) => [k, limpar(v, `${caminho}.${k}`, k, avisos)]),
    );
  }
  return atual;
}

function lerJson<S extends z.ZodType>(arquivo: string, schema: S, avisos: string[]): z.output<S> {
  const relativo = path.relative(RAIZ, arquivo).replaceAll("\\", "/");
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(arquivo, "utf8"));
  } catch (erro) {
    throw new Error(`${relativo}: JSON inválido. ${(erro as Error).message}`);
  }
  const resultado = schema.safeParse(limpar(bruto, relativo, "", avisos));
  if (!resultado.success) {
    throw new Error(`${relativo}: conteúdo inválido.\n${z.prettifyError(resultado.error)}`);
  }
  return resultado.data;
}

function carregarJogo(arquivo: string, edicao: Edicao, avisos: string[]): Jogo {
  const nomeArquivo = path.basename(arquivo, ".json");
  const jogo = lerJson(arquivo, jogoSchema, avisos);
  if (jogo.slug !== nomeArquivo) {
    throw new Error(`${arquivo}: slug "${jogo.slug}" diferente do nome do arquivo.`);
  }
  if (!edicao.turmas.some((t) => t.id === jogo.turma)) {
    throw new Error(`${arquivo}: turma "${jogo.turma}" não existe em edicao.json.`);
  }
  // Sem autorização de imagem, os nomes da equipe não chegam a nenhuma tela.
  return jogo.autorizacaoImagem ? jogo : { ...jogo, equipe: [] };
}

function carregarEdicoes(avisos: string[]): EdicaoCompleta[] {
  const anos = readdirSync(PASTA_EDICOES, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^\d{4}$/.test(item.name))
    .map((item) => item.name)
    .filter((ano) => existsSync(path.join(PASTA_EDICOES, ano, "edicao.json")))
    .sort();

  return anos.map((ano) => {
    const pasta = path.join(PASTA_EDICOES, ano);
    const edicao = lerJson(path.join(pasta, "edicao.json"), edicaoSchema, avisos);
    if (String(edicao.ano) !== ano) {
      throw new Error(`edicoes/${ano}/edicao.json: "ano" é ${edicao.ano}, diferente da pasta.`);
    }
    const pastaJogos = path.join(pasta, "jogos");
    const jogos = existsSync(pastaJogos)
      ? readdirSync(pastaJogos)
          .filter((nome) => nome.endsWith(".json"))
          .sort()
          .map((nome) => carregarJogo(path.join(pastaJogos, nome), edicao, avisos))
      : [];
    return { ...edicao, jogos };
  });
}

let cache: Conteudo | undefined;

/** Lê e valida todo o conteúdo. Lança erro se algo for inválido. */
export function carregarConteudo(): Conteudo {
  // Fora de produção relê sempre, para refletir na hora as edições nos JSON.
  if (cache && process.env.NODE_ENV === "production") return cache;
  const avisos: string[] = [];
  const edicoes = carregarEdicoes(avisos);
  if (edicoes.length === 0) throw new Error("Nenhuma edição encontrada em content/edicoes.");
  const mentores = lerJson(path.join(RAIZ, "content", "mentores.json"), mentoresSchema, avisos);
  cache = { edicoes, mentores, avisos };
  return cache;
}

export function buscarEdicao(ano: string): EdicaoCompleta | undefined {
  return carregarConteudo().edicoes.find((e) => String(e.ano) === ano);
}

export function edicaoMaisRecente(): EdicaoCompleta {
  const { edicoes } = carregarConteudo();
  return edicoes.findLast((e) => e.jogos.length > 0) ?? edicoes.at(-1)!;
}
