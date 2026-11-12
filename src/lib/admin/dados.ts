/**
 * Leitura do conteúdo para as telas do admin. Lê pelo repositorio.ts (GitHub ou
 * disco), e não pelo conteúdo do build: assim o painel mostra o que está no
 * branch agora, mesmo antes de o deploy terminar.
 */
import { z } from "zod";
import { edicaoSchema, jogoSchema, PADRAO_ANO, type Edicao } from "../esquema.ts";
import { conferirComoBuild, limparConteudo, type Pendencia } from "../limpeza.ts";
import { caminhos, paraSrc } from "./caminhos.ts";
import { ehObjeto } from "./formulario.ts";
import { slugDoMentor } from "./formularioMentor.ts";
import { lerArquivo, listarArquivos, listarTudo } from "./repositorio.ts";
import { descreverParaPainel } from "./rotulos.ts";

const nomeDe = (caminho: string) => caminho.slice(caminho.lastIndexOf("/") + 1);

/** Slugs dos jogos pelos nomes dos arquivos da pasta: "…/jogos/heaven-runner.json" → "heaven-runner". */
const slugsDosArquivos = (arquivos: string[]) =>
  arquivos.map(nomeDe).filter((nome) => nome.endsWith(".json")).map((nome) => nome.slice(0, -5));

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
  return new Set((await listarTudo(caminhos.pastaDesenhos(ano))).map(paraSrc));
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

/** Slugs dos jogos da edição (pelos nomes dos arquivos). */
export async function listarJogos(ano: string): Promise<string[]> {
  return slugsDosArquivos(await listarArquivos(caminhos.pastaJogos(ano)));
}

/**
 * Todos os jogos da edição, já lidos (uma leitura por jogo). `arquivos` é a pasta
 * como estava: quem grava pode conferir que nenhum jogo entrou ou saiu desde então.
 */
export async function jogosDaEdicao(ano: string) {
  const arquivos = await listarArquivos(caminhos.pastaJogos(ano));
  const slugs = slugsDosArquivos(arquivos);
  const lidos = await Promise.all(slugs.map((slug) => lerJson(caminhos.jogo(ano, slug))));
  return { arquivos, jogos: slugs.flatMap((slug, i) => (lidos[i] ? [{ slug, lido: lidos[i] }] : [])) };
}

type FichaMentor = Record<string, unknown>;

const nomeDa = (ficha: FichaMentor) => (typeof ficha.nome === "string" ? ficha.nome : "");

/** A lista como está no arquivo (fichas cruas, com tudo o que tiverem) e o sha. */
export async function lerMentores(): Promise<{ fichas: FichaMentor[]; sha: string | null; erro?: string }> {
  const arquivo = await lerArquivo(caminhos.mentores());
  if (!arquivo) return { fichas: [], sha: null, erro: "O arquivo content/mentores.json não existe." };
  try {
    const dados: unknown = JSON.parse(arquivo.conteudo);
    if (!Array.isArray(dados)) return { fichas: [], sha: arquivo.sha, erro: "O mentores.json não é uma lista." };
    const fichas = dados.filter(ehObjeto);
    // Cada mentor é achado pelo slug do nome: nome vazio ou dois nomes com o mesmo
    // slug ("Ana Souza" e "Ana souza") deixariam o admin mexendo na ficha errada.
    const vistos = new Set<string>();
    for (const ficha of fichas) {
      const slug = slugDoMentor(nomeDa(ficha));
      if (!slug) return { fichas: [], sha: arquivo.sha, erro: "Há um mentor sem nome no mentores.json." };
      if (vistos.has(slug)) {
        return { fichas: [], sha: arquivo.sha, erro: `Dois mentores têm nomes quase iguais ("${nomeDa(ficha)}"). Deixe os nomes diferentes no mentores.json.` };
      }
      vistos.add(slug);
    }
    return { fichas, sha: arquivo.sha };
  } catch (erro) {
    return { fichas: [], sha: arquivo.sha, erro: `JSON inválido: ${(erro as Error).message}` };
  }
}

/** Nomes dos mentores, para escolher o de cada turma. */
export async function nomesDosMentores(): Promise<string[]> {
  return (await lerMentores()).fichas.map(nomeDa);
}

export type EdicaoLida = {
  edicao: Edicao | null;
  /** Sha do edicao.json lido (null se não existe): quem grava um jogo confere se ele não mudou. */
  sha: string | null;
  /** O edicao.json não existe (a pasta do ano pode existir sem ele). */
  semArquivo: boolean;
  erroEdicao?: string;
  /** Ids das turmas, na ordem da edição; vazio se a edição não for válida. */
  turmas: string[];
};

/**
 * Lê o edicao.json e devolve a edição validada pelo mesmo esquema do build, ou o
 * motivo de não estar válida. Toda tela e rota do admin lê a edição por aqui.
 */
export async function lerEdicao(ano: string): Promise<EdicaoLida> {
  const lido = await lerJson(caminhos.edicao(ano));
  if (!lido) return { edicao: null, sha: null, semArquivo: true, erroEdicao: "Esta edição não tem edicao.json.", turmas: [] };
  const base = { sha: lido.sha, semArquivo: false };
  if ("erro" in lido) return { ...base, edicao: null, erroEdicao: lido.erro, turmas: [] };
  const resultado = conferirComoBuild(edicaoSchema, lido.dados);
  return resultado.success
    ? { ...base, edicao: resultado.data, turmas: resultado.data.turmas.map((t) => t.id) }
    : { ...base, edicao: null, erroEdicao: z.prettifyError(resultado.error), turmas: [] };
}

/** O que o formulário do jogo (e o painel) precisa saber da edição. */
export async function contextoDoFormulario(ano: string) {
  const [edicaoLida, slugs, imagens] = await Promise.all([lerEdicao(ano), listarJogos(ano), imagensDaEdicao(ano)]);
  return { ...edicaoLida, slugs, imagens: [...imagens] };
}

export async function painelDaEdicao(ano: string): Promise<PainelEdicao> {
  const [{ edicao, erroEdicao, turmas }, { jogos: lidos }, imagens] = await Promise.all([
    lerEdicao(ano),
    jogosDaEdicao(ano),
    imagensDaEdicao(ano),
  ]);
  const jogos = lidos
    .map(({ slug, lido }) => resumir(slug, lido, turmas, (src) => imagens.has(src)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { ano, edicao, erroEdicao, turmas, jogos };
}
