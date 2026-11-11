/**
 * Armazenamento do admin. O GitHub é o "banco de dados": cada salvamento vira um
 * commit em GITHUB_BRANCH, e a Vercel publica sozinha.
 *
 * TODA a conversa com o GitHub fica neste arquivo. O resto do admin só conhece as
 * funções exportadas no fim (lerArquivo, listarArquivos, listarTudo,
 * salvarArquivos, apagarArquivos).
 *
 * Com ADMIN_MODO=local, as mesmas funções gravam direto em content/ e public/,
 * para testar no localhost sem gerar commits.
 *
 * ─── FUTURO: trocar o token pessoal por um GitHub App da organização ───────────
 * Só muda a função `cabecalhosAutenticacao` (e as variáveis de ambiente):
 *   1. Criar o App na organização com a permissão "Contents: read and write" e
 *      instalar só neste repositório.
 *   2. Trocar GITHUB_TOKEN por GITHUB_APP_ID, GITHUB_APP_CHAVE_PRIVADA e
 *      GITHUB_APP_INSTALACAO_ID.
 *   3. Em `cabecalhosAutenticacao`, assinar um JWT (RS256, validade de 10 min) com
 *      a chave privada, chamar POST /app/installations/{id}/access_tokens e usar o
 *      token devolvido (vale 1h; guardar em memória e renovar perto de expirar).
 * Os commits passam a aparecer como feitos pelo App ("nome-do-app[bot]").
 * ────────────────────────────────────────────────────────────────────────────────
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validarCaminho, validarPasta } from "./caminhos.ts";

export type ArquivoParaSalvar = {
  caminho: string;
  conteudo: Buffer | string;
  /**
   * Sha que o arquivo tinha quando foi lido para edição. Se for diferente do sha
   * atual, alguém salvou antes: o commit é recusado com ConflitoError.
   * `null` exige que o arquivo ainda não exista (ex.: jogo novo, slug livre).
   * Sem o campo, não há conferência (ex.: imagens).
   */
  shaAnterior?: string | null;
};

export type Conferencia = { caminho: string; sha: string | null };

export type OpcoesSalvar = {
  /**
   * Arquivos a apagar no mesmo commit (ex.: imagens do slug antigo). Um caminho que
   * é gravado, ou que recebe um arquivo pelo `mover`, não é apagado.
   */
  apagar?: string[];
  /**
   * Shas a conferir além dos `shaAnterior` dos arquivos gravados. Ex.: ao excluir
   * um jogo, o sha que a ficha tinha quando a pessoa abriu o painel.
   */
  conferir?: Conferencia[];
  /**
   * Arquivos que mudam de lugar no mesmo commit (ex.: desenhos quando o slug muda).
   * Origem que não existe é ignorada. Se o destino também está entre os arquivos
   * gravados, vale o gravado (é uma imagem nova) e a origem só é apagada.
   */
  mover?: { de: string; para: string }[];
  /**
   * Conteúdo de uma pasta como estava na leitura. Se alguém criou ou apagou um
   * arquivo nela desde então, o commit é recusado (ex.: um jogo novo numa turma
   * que está sendo renomeada).
   */
  conferirPasta?: { pasta: string; itens: string[] };
};

function mesmaLista(a: string[], b: string[]) {
  const [x, y] = [[...a].sort(), [...b].sort()];
  return x.length === y.length && x.every((item, i) => item === y[i]);
}

/** Todas as conferências de um salvamento: as dos arquivos gravados e as avulsas. */
function conferencias(arquivos: ArquivoParaSalvar[], opcoes: OpcoesSalvar): Conferencia[] {
  return [
    ...arquivos.flatMap((a) => (a.shaAnterior === undefined ? [] : [{ caminho: a.caminho, sha: a.shaAnterior }])),
    ...(opcoes.conferir ?? []),
  ];
}

export class ConflitoError extends Error {
  readonly caminho: string;
  constructor(caminho: string) {
    super("Outra pessoa salvou este conteúdo agora. Recarregue a página para ver a versão nova.");
    this.name = "ConflitoError";
    this.caminho = caminho;
  }
}

export class RepositorioError extends Error {
  readonly status?: number;
  constructor(mensagem: string, status?: number) {
    super(mensagem);
    this.name = "RepositorioError";
    this.status = status;
  }
}

/** Sha que o git daria ao arquivo (o mesmo que a API do GitHub devolve). */
export function shaDoGit(conteudo: Buffer | string): string {
  const dados = typeof conteudo === "string" ? Buffer.from(conteudo, "utf8") : conteudo;
  return createHash("sha1")
    .update(`blob ${dados.length}\0`)
    .update(dados)
    .digest("hex");
}

// ─── Modo GitHub ────────────────────────────────────────────────────────────────

type ConfigGithub = { owner: string; repo: string; branch: string };

function configGithub(): ConfigGithub {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!owner || !repo) {
    throw new RepositorioError("Configure GITHUB_OWNER e GITHUB_REPO (veja o .env.example).");
  }
  return { owner, repo, branch };
}

/** Único ponto de autenticação. É aqui que entra o GitHub App no futuro. */
async function cabecalhosAutenticacao(): Promise<Record<string, string>> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new RepositorioError("Configure GITHUB_TOKEN (veja o .env.example).");
  return { Authorization: `Bearer ${token}` };
}

async function github<T>(metodo: string, rota: string, corpo?: unknown): Promise<{ status: number; dados: T }> {
  const { owner, repo } = configGithub();
  const resposta = await fetch(`https://api.github.com/repos/${owner}/${repo}${rota}`, {
    method: metodo,
    headers: {
      ...(await cabecalhosAutenticacao()),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  const texto = await resposta.text();
  let dados: T;
  try {
    dados = (texto ? JSON.parse(texto) : null) as T;
  } catch {
    // Numa instabilidade, o GitHub responde com uma página HTML em vez de JSON.
    throw new RepositorioError(
      `O GitHub respondeu de um jeito inesperado (${resposta.status}). Tente de novo em alguns minutos.`,
      resposta.status,
    );
  }
  return { status: resposta.status, dados };
}

function falhou(acao: string, status: number, dados: unknown): never {
  const detalhe = (dados as { message?: string } | null)?.message ?? "sem detalhes";
  if (status === 401) throw new RepositorioError("Token do GitHub inválido ou expirado.", status);
  if (status === 403) throw new RepositorioError(`Sem permissão no GitHub para ${acao}: ${detalhe}`, status);
  throw new RepositorioError(`Erro do GitHub ao ${acao} (${status}): ${detalhe}`, status);
}

/** Codifica cada parte do caminho, para turmas e nomes com acento. */
function rotaConteudo(caminho: string, ref: string) {
  const codificado = caminho.split("/").map(encodeURIComponent).join("/");
  return `/contents/${codificado}?ref=${encodeURIComponent(ref)}`;
}

type ItemConteudo = { type: string; path: string; sha: string; content?: string; encoding?: string };

const githubRepo = {
  async lerArquivo(caminho: string, ref = configGithub().branch) {
    const { status, dados } = await github<ItemConteudo>("GET", rotaConteudo(caminho, ref));
    if (status === 404) return null;
    if (status !== 200) falhou(`ler ${caminho}`, status, dados);
    if (Array.isArray(dados) || dados.type !== "file") return null;
    // Arquivos acima de 1 MB vêm sem conteúdo; aqui só lemos JSON, bem menores.
    const conteudo = Buffer.from(dados.content ?? "", "base64").toString("utf8");
    return { conteudo, sha: dados.sha };
  },

  async listarArquivos(pasta: string, ref = configGithub().branch) {
    const { status, dados } = await github<ItemConteudo[]>("GET", rotaConteudo(pasta, ref));
    if (status === 404) return [];
    if (status !== 200) falhou(`listar ${pasta}`, status, dados);
    return Array.isArray(dados) ? dados.map((item) => item.path).sort() : [];
  },

  /** Uma chamada só: a árvore inteira do branch, filtrada pela pasta. */
  async listarTudo(pasta: string) {
    const { branch } = configGithub();
    const { status, dados } = await github<{ tree: { path: string; type: string }[]; truncated: boolean }>(
      "GET",
      `/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );
    if (status !== 200) falhou(`listar ${pasta}`, status, dados);
    // Só passa de 100 mil arquivos com muitos anos de catálogo; aí a lista viria cortada.
    if (dados.truncated) throw new RepositorioError("O repositório ficou grande demais para listar de uma vez.");
    const prefixo = `${pasta}/`;
    return dados.tree
      .filter((item) => item.type === "blob" && item.path.startsWith(prefixo))
      .map((item) => item.path)
      .sort();
  },

  /** blobs → tree → commit → update ref, tudo num único commit. */
  async salvarArquivos(arquivos: ArquivoParaSalvar[], mensagem: string, opcoes: OpcoesSalvar = {}) {
    const { branch } = configGithub();

    const ref = await github<{ object: { sha: string } }>("GET", `/git/ref/heads/${encodeURIComponent(branch)}`);
    if (ref.status !== 200) falhou(`ler o branch ${branch}`, ref.status, ref.dados);
    const commitBase = ref.dados.object.sha;

    const base = await github<{ tree: { sha: string } }>("GET", `/git/commits/${commitBase}`);
    if (base.status !== 200) falhou("ler o último commit", base.status, base.dados);

    // Confere os shas contra o commit que vai servir de base, não contra o branch:
    // se o branch andar depois disso, o update ref (sem force) recusa.
    // As conferências não dependem umas das outras: vão todas juntas.
    const { conferirPasta } = opcoes;
    await Promise.all([
      ...conferencias(arquivos, opcoes).map(async ({ caminho, sha }) => {
        const atual = await githubRepo.lerArquivo(caminho, commitBase);
        if ((atual?.sha ?? null) !== sha) throw new ConflitoError(caminho);
      }),
      ...(conferirPasta
        ? [
            (async () => {
              const atuais = await githubRepo.listarArquivos(conferirPasta.pasta, commitBase);
              if (!mesmaLista(atuais, conferirPasta.itens)) throw new ConflitoError(conferirPasta.pasta);
            })(),
          ]
        : []),
    ]);

    const gravados = new Set(arquivos.map((a) => a.caminho));

    // Mover no git não precisa baixar nada: o destino aponta para o mesmo blob da origem.
    const movidos = (
      await Promise.all(
        (opcoes.mover ?? []).map(async ({ de, para }) => {
          const { status, dados } = await github<ItemConteudo>("GET", rotaConteudo(de, commitBase));
          return status === 200 && !Array.isArray(dados) && dados.type === "file" ? { de, para, sha: dados.sha } : null;
        }),
      )
    ).filter((m) => m !== null);

    // Apagar um caminho que não existe faz o GitHub recusar a tree inteira.
    const tocados = new Set([...movidos.map((m) => m.de), ...movidos.map((m) => m.para)]);
    const candidatos = (opcoes.apagar ?? []).filter((caminho) => !gravados.has(caminho) && !tocados.has(caminho));
    const existem = await Promise.all(
      candidatos.map(async (caminho) => (await github<unknown>("GET", rotaConteudo(caminho, commitBase))).status === 200),
    );
    const apagar = candidatos.filter((_, i) => existem[i]);

    const blobs = await Promise.all(
      arquivos.map(async (arquivo) => {
        const dados = typeof arquivo.conteudo === "string" ? Buffer.from(arquivo.conteudo, "utf8") : arquivo.conteudo;
        const blob = await github<{ sha: string }>("POST", "/git/blobs", {
          content: dados.toString("base64"),
          encoding: "base64",
        });
        if (blob.status !== 201) falhou(`enviar ${arquivo.caminho}`, blob.status, blob.dados);
        return { path: arquivo.caminho, mode: "100644" as const, type: "blob" as const, sha: blob.dados.sha as string | null };
      }),
    );
    const entrada = (caminho: string, sha: string | null) => ({
      path: caminho,
      mode: "100644" as const,
      type: "blob" as const,
      sha,
    });
    const entradas = [
      ...blobs,
      ...movidos.flatMap((m) => [
        ...(gravados.has(m.para) ? [] : [entrada(m.para, m.sha)]),
        ...(gravados.has(m.de) ? [] : [entrada(m.de, null)]),
      ]),
      ...apagar.map((caminho) => entrada(caminho, null)),
    ];

    // Ex.: apagar imagens que nunca foram enviadas. Nada muda, então não há commit.
    if (entradas.length === 0) return { commitUrl: "" };

    const tree = await github<{ sha: string }>("POST", "/git/trees", {
      base_tree: base.dados.tree.sha,
      tree: entradas,
    });
    if (tree.status !== 201) falhou("montar a árvore do commit", tree.status, tree.dados);

    const commit = await github<{ sha: string; html_url: string }>("POST", "/git/commits", {
      message: mensagem,
      tree: tree.dados.sha,
      parents: [commitBase],
    });
    if (commit.status !== 201) falhou("criar o commit", commit.status, commit.dados);

    const atualizado = await github<unknown>("PATCH", `/git/refs/heads/${encodeURIComponent(branch)}`, {
      sha: commit.dados.sha,
      force: false,
    });
    // 422 aqui = o branch andou entre a leitura e o commit: alguém salvou junto.
    if (atualizado.status === 422) throw new ConflitoError(arquivos[0]?.caminho ?? apagar[0]);
    if (atualizado.status !== 200) falhou("atualizar o branch", atualizado.status, atualizado.dados);

    return { commitUrl: commit.dados.html_url };
  },
};

// ─── Modo local (ADMIN_MODO=local) ──────────────────────────────────────────────

const RAIZ = process.cwd();
const noDisco = (caminho: string) => path.join(RAIZ, ...caminho.split("/"));

async function lerDoDisco(caminho: string): Promise<Buffer | null> {
  try {
    return await readFile(noDisco(caminho));
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw erro;
  }
}

const localRepo = {
  async lerArquivo(caminho: string) {
    const dados = await lerDoDisco(caminho);
    return dados ? { conteudo: dados.toString("utf8"), sha: shaDoGit(dados) } : null;
  },

  async listarArquivos(pasta: string) {
    try {
      const itens = await readdir(noDisco(pasta));
      return itens.map((nome) => `${pasta}/${nome}`).sort();
    } catch (erro) {
      // Pasta que não existe, ou um arquivo no lugar dela: nada a listar (igual ao GitHub).
      if (["ENOENT", "ENOTDIR"].includes((erro as NodeJS.ErrnoException).code ?? "")) return [];
      throw erro;
    }
  },

  async listarTudo(pasta: string) {
    try {
      const itens = await readdir(noDisco(pasta), { recursive: true, withFileTypes: true });
      return itens
        .filter((item) => item.isFile())
        .map((item) => path.relative(RAIZ, path.join(item.parentPath, item.name)).split(path.sep).join("/"))
        .sort();
    } catch (erro) {
      if (["ENOENT", "ENOTDIR"].includes((erro as NodeJS.ErrnoException).code ?? "")) return [];
      throw erro;
    }
  },

  async salvarArquivos(arquivos: ArquivoParaSalvar[], mensagem: string, opcoes: OpcoesSalvar = {}) {
    for (const { caminho, sha } of conferencias(arquivos, opcoes)) {
      const atual = await lerDoDisco(caminho);
      if ((atual ? shaDoGit(atual) : null) !== sha) throw new ConflitoError(caminho);
    }
    if (opcoes.conferirPasta) {
      const atuais = await localRepo.listarArquivos(opcoes.conferirPasta.pasta);
      if (!mesmaLista(atuais, opcoes.conferirPasta.itens)) throw new ConflitoError(opcoes.conferirPasta.pasta);
    }
    // Sem commit no disco, a ordem evita estados quebrados se algo falhar no meio:
    // primeiro tudo o que é escrito, e só no fim o que é apagado.
    const gravados = new Set(arquivos.map((a) => a.caminho));
    const movidos: { de: string; para: string; dados: Buffer }[] = [];
    for (const { de, para } of opcoes.mover ?? []) {
      const dados = await lerDoDisco(de);
      if (dados) movidos.push({ de, para, dados });
    }

    const escrever = async (caminho: string, conteudo: Buffer | string) => {
      await mkdir(path.dirname(noDisco(caminho)), { recursive: true });
      await writeFile(noDisco(caminho), conteudo);
    };
    for (const arquivo of arquivos) await escrever(arquivo.caminho, arquivo.conteudo);
    // Se o destino também foi gravado, vale o gravado (é uma imagem nova).
    for (const m of movidos) if (!gravados.has(m.para)) await escrever(m.para, m.dados);

    const chegaram = new Set([...gravados, ...movidos.map((m) => m.para)]);
    const sair = [...movidos.map((m) => m.de), ...(opcoes.apagar ?? [])];
    for (const caminho of new Set(sair)) {
      if (!chegaram.has(caminho)) await rm(noDisco(caminho), { force: true });
    }
    console.info(`[admin local] ${mensagem}`);
    return { commitUrl: "" };
  },
};

// ─── Interface pública ──────────────────────────────────────────────────────────

export function modoLocal() {
  return process.env.ADMIN_MODO === "local";
}

function implementacao() {
  return modoLocal() ? localRepo : githubRepo;
}

/** Lê um arquivo de texto. `null` se não existir. */
export async function lerArquivo(caminho: string): Promise<{ conteudo: string; sha: string } | null> {
  return implementacao().lerArquivo(validarPasta(caminho));
}

/** Caminhos (a partir da raiz do repositório) dos itens de uma pasta, em ordem. */
export async function listarArquivos(pasta: string): Promise<string[]> {
  return implementacao().listarArquivos(validarPasta(pasta));
}

/**
 * Todos os arquivos dentro da pasta, em qualquer nível. No GitHub é uma chamada só,
 * em vez de uma por subpasta (ex.: as imagens de todos os jogos da edição).
 */
export async function listarTudo(pasta: string): Promise<string[]> {
  return implementacao().listarTudo(validarPasta(pasta));
}

/** Grava todos os arquivos num único commit. `commitUrl` vem vazio no modo local. */
export async function salvarArquivos(
  arquivos: ArquivoParaSalvar[],
  mensagem: string,
  opcoes: OpcoesSalvar = {},
): Promise<{ commitUrl: string }> {
  const validados = arquivos.map((a) => ({ ...a, caminho: validarCaminho(a.caminho) }));
  const apagar = (opcoes.apagar ?? []).map(validarCaminho);
  const conferir = (opcoes.conferir ?? []).map((c) => ({ ...c, caminho: validarPasta(c.caminho) }));
  const mover = (opcoes.mover ?? []).map((m) => ({ de: validarCaminho(m.de), para: validarCaminho(m.para) }));
  const conferirPasta = opcoes.conferirPasta && { ...opcoes.conferirPasta, pasta: validarPasta(opcoes.conferirPasta.pasta) };
  return implementacao().salvarArquivos(validados, mensagem, { apagar, conferir, mover, conferirPasta });
}

/**
 * Apaga os arquivos num único commit. Com `conferir`, recusa (ConflitoError) se
 * algum arquivo mudou desde que foi lido.
 */
export async function apagarArquivos(caminhos: string[], mensagem: string, conferir: Conferencia[] = []): Promise<void> {
  await salvarArquivos([], mensagem, { apagar: caminhos, conferir });
}
