import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { edicaoSchema, jogoSchema, mentoresSchema, PADRAO_ANO, type Edicao, type Jogo, type Mentor } from "./esquema.ts";
import { descreverPendencia, limparConteudo, type Pendencia } from "./limpeza.ts";

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

/** No build, a imagem existe se está em public/. */
const existeNoDisco = (src: string) => existsSync(path.join(RAIZ, "public", src));

function lerJson<S extends z.ZodType>(arquivo: string, schema: S, avisos: string[]): z.output<S> {
  const relativo = path.relative(RAIZ, arquivo).replaceAll("\\", "/");
  let bruto: unknown;
  try {
    bruto = JSON.parse(readFileSync(arquivo, "utf8"));
  } catch (erro) {
    throw new Error(`${relativo}: JSON inválido. ${(erro as Error).message}`);
  }
  const pendencias: Pendencia[] = [];
  const limpo = limparConteudo(bruto, { existeImagem: existeNoDisco }, pendencias);
  avisos.push(...pendencias.map((p) => descreverPendencia(relativo, p)));
  const resultado = schema.safeParse(limpo);
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
    .filter((item) => item.isDirectory() && PADRAO_ANO.test(item.name))
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
