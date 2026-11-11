/**
 * Leitura do conteúdo para as telas do admin. Lê pelo repositorio.ts (GitHub ou
 * disco), e não pelo conteúdo do build: assim o painel mostra o que está no
 * branch agora, mesmo antes de o deploy terminar.
 */
import { z } from "zod";
import { edicaoSchema, jogoSchema, PADRAO_ANO, type Edicao } from "../esquema.ts";
import { limparConteudo, type Pendencia } from "../limpeza.ts";
import { caminhos } from "./caminhos.ts";
import { lerArquivo, listarArquivos, listarTudo } from "./repositorio.ts";
import { descreverParaPainel } from "./rotulos.ts";

const nomeDe = (caminho: string) => caminho.slice(caminho.lastIndexOf("/") + 1);

/** Objeto JSON comum (não null, não lista): o formato de toda ficha e edição. */
export function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Anos com pasta em content/edicoes, do mais recente para o mais antigo. */
export async function listarAnos(): Promise<string[]> {
  const itens = await listarArquivos("content/edicoes");
  return itens
    .map(nomeDe)
    .filter((nome) => PADRAO_ANO.test(nome))
    .sort()
    .reverse();
}

export type JsonLido =
  | { dados: Record<string, unknown>; sha: string }
  | { erro: string; sha: string }
  | null;

/** Lê e interpreta um JSON do repositório. `null` se não existir. */
export async function lerJson(caminho: string): Promise<JsonLido> {
  const arquivo = await lerArquivo(caminho);
  if (!arquivo) return null;
  let dados: unknown;
  try {
    dados = JSON.parse(arquivo.conteudo);
  } catch (erro) {
    return { erro: `JSON inválido: ${(erro as Error).message}`, sha: arquivo.sha };
  }
  if (!ehObjeto(dados)) return { erro: "O arquivo não tem um objeto JSON ({ ... }).", sha: arquivo.sha };
  return { dados, sha: arquivo.sha };
}

/** srcs ("/edicoes/2026/slug/mundo.webp") de todas as imagens já enviadas da edição. */
async function imagensDaEdicao(ano: string): Promise<Set<string>> {
  const arquivos = await listarTudo(`public/edicoes/${ano}`);
  return new Set(arquivos.map((caminho) => caminho.replace(/^public/, "")));
}

/** Campos que podem ficar em branco sem virar pendência. */
const OPCIONAIS = new Set(["link", "agradecimento", "lema", "mentor"]);

export type StatusJogo = "completo" | "pendente" | "semAutorizacao" | "invalido";

export type ResumoJogo = {
  slug: string;
  /** Sha da ficha quando o painel foi aberto: a exclusão confere se ainda é o mesmo. */
  sha: string;
  nome: string;
  estudio: string;
  turma: string;
  status: StatusJogo;
  /** Campos vazios e imagens que faltam, já com o nome em português. */
  pendencias: string[];
  /** Para status "invalido": o motivo. */
  erro?: string;
};

export type PainelEdicao = {
  ano: string;
  edicao: Edicao | null;
  erroEdicao?: string;
  /** Ids das turmas, na ordem da edição. */
  turmas: string[];
  jogos: ResumoJogo[];
};

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

function resumir(
  slug: string,
  lido: Exclude<JsonLido, null>,
  turmas: string[],
  existeImagem: (src: string) => boolean,
): ResumoJogo {
  if ("erro" in lido) {
    return { slug, sha: lido.sha, nome: slug, estudio: "", turma: "", status: "invalido", pendencias: [], erro: lido.erro };
  }

  const { dados } = lido;
  const base = {
    slug,
    sha: lido.sha,
    nome: texto(dados.nome) || slug,
    estudio: texto(dados.estudio),
    turma: texto(dados.turma),
  };

  const pendencias: Pendencia[] = [];
  const limpo = limparConteudo(dados, { existeImagem, contarVazios: true, opcionais: OPCIONAIS }, pendencias);
  const lista = [...new Set(pendencias.map(descreverParaPainel))];
  const resultado = jogoSchema.safeParse(limpo);

  // Os mesmos motivos que fariam o build falhar.
  const invalido = (erro: string): ResumoJogo => ({ ...base, status: "invalido", pendencias: lista, erro });
  if (!resultado.success) return invalido(z.prettifyError(resultado.error));
  const jogo = resultado.data;
  if (jogo.slug !== slug) return invalido(`O slug "${jogo.slug}" é diferente do nome do arquivo.`);
  if (!turmas.includes(jogo.turma)) return invalido(`A turma "${jogo.turma}" não existe na edição.`);

  if (!jogo.autorizacaoImagem) return { ...base, status: "semAutorizacao", pendencias: lista };
  return { ...base, status: lista.length > 0 ? "pendente" : "completo", pendencias: lista };
}

export async function painelDaEdicao(ano: string): Promise<PainelEdicao> {
  const [lidoEdicao, arquivosJogos, imagens] = await Promise.all([
    lerJson(caminhos.edicao(ano)),
    listarArquivos(caminhos.pastaJogos(ano)),
    imagensDaEdicao(ano),
  ]);

  let edicao: Edicao | null = null;
  let erroEdicao: string | undefined;
  if (!lidoEdicao) erroEdicao = "Esta edição não tem edicao.json.";
  else if ("erro" in lidoEdicao) erroEdicao = lidoEdicao.erro;
  else {
    const resultado = edicaoSchema.safeParse(limparConteudo(lidoEdicao.dados, { existeImagem: () => true }, []));
    if (resultado.success) edicao = resultado.data;
    else erroEdicao = z.prettifyError(resultado.error);
  }
  const turmas = edicao?.turmas.map((t) => t.id) ?? [];

  const slugs = arquivosJogos.map(nomeDe).filter((nome) => nome.endsWith(".json")).map((nome) => nome.slice(0, -5));
  const lidos = await Promise.all(slugs.map((slug) => lerJson(caminhos.jogo(ano, slug))));
  const jogos = slugs
    .map((slug, i) => (lidos[i] ? resumir(slug, lidos[i], turmas, (src) => imagens.has(src)) : null))
    .filter((jogo): jogo is ResumoJogo => jogo !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { ano, edicao, erroEdicao, turmas, jogos };
}
