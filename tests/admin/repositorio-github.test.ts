import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  apagarArquivos,
  ConflitoError,
  lerArquivo,
  listarArquivos,
  listarTudo,
  RepositorioError,
  salvarArquivos,
  shaDoGit,
} from "../../src/lib/admin/repositorio.ts";
import { CaminhoInvalidoError } from "../../src/lib/admin/caminhos.ts";
import { criarGithubFalso, TOKEN } from "./githubFalso.ts";

const FICHA = "content/edicoes/2026/jogos/heaven-runner.json";
const DESENHO = "public/edicoes/2026/heaven-runner/mundo.webp";

let github: ReturnType<typeof criarGithubFalso>;

beforeEach(() => {
  vi.stubEnv("ADMIN_MODO", "github");
  vi.stubEnv("GITHUB_TOKEN", TOKEN);
  vi.stubEnv("GITHUB_OWNER", "dono");
  vi.stubEnv("GITHUB_REPO", "repo");
  vi.stubEnv("GITHUB_BRANCH", "main");
  github = criarGithubFalso({
    [FICHA]: '{ "nome": "Heaven Runner" }\n',
    [DESENHO]: Buffer.from([1, 2, 3]),
    "content/edicoes/2026/edicao.json": '{ "ano": 2026 }\n',
  });
  vi.stubGlobal("fetch", github.fetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("leitura", () => {
  test("lê o arquivo com o mesmo sha que o git daria", async () => {
    const lido = await lerArquivo(FICHA);
    expect(lido?.conteudo).toBe('{ "nome": "Heaven Runner" }\n');
    expect(lido?.sha).toBe(shaDoGit('{ "nome": "Heaven Runner" }\n'));
  });

  test("arquivo ou pasta que não existe: null e lista vazia", async () => {
    expect(await lerArquivo("content/edicoes/2026/jogos/nao-existe.json")).toBeNull();
    expect(await listarArquivos("content/edicoes/2099")).toEqual([]);
  });

  test("lista uma pasta e, numa chamada só, tudo abaixo dela", async () => {
    expect(await listarArquivos("content/edicoes/2026")).toEqual([
      "content/edicoes/2026/edicao.json",
      "content/edicoes/2026/jogos",
    ]);
    expect(await listarTudo("public/edicoes/2026")).toEqual([DESENHO]);
    expect(github.chamadas.filter((c) => c.startsWith("GET /git/trees"))).toHaveLength(1);
  });
});

describe("gravação", () => {
  test("ficha e desenho num único commit", async () => {
    const { commitUrl } = await salvarArquivos(
      [
        { caminho: FICHA, conteudo: '{ "nome": "Novo" }\n', shaAnterior: shaDoGit('{ "nome": "Heaven Runner" }\n') },
        { caminho: DESENHO, conteudo: Buffer.from([9, 9]) },
      ],
      "conteudo(2026): edita heaven-runner [por Thaysa]",
    );
    expect(commitUrl).toMatch(/^https:\/\/github.com\/dono\/repo\/commit\//);
    expect(github.commits()).toBe(1);
    expect(github.texto(FICHA)).toBe('{ "nome": "Novo" }\n');
    expect([...github.arquivos.get(DESENHO)!]).toEqual([9, 9]);
  });

  test("sha diferente do lido: conflito, e nada é gravado", async () => {
    github.salvarPorFora(FICHA, '{ "nome": "Outra pessoa" }\n');
    await expect(
      salvarArquivos([{ caminho: FICHA, conteudo: "{}\n", shaAnterior: shaDoGit('{ "nome": "Heaven Runner" }\n') }], "x"),
    ).rejects.toBeInstanceOf(ConflitoError);
    expect(github.texto(FICHA)).toBe('{ "nome": "Outra pessoa" }\n');
    expect(github.chamadas.some((c) => c.startsWith("PATCH"))).toBe(false);
  });

  test("shaAnterior null exige arquivo novo (slug livre)", async () => {
    await expect(salvarArquivos([{ caminho: FICHA, conteudo: "{}\n", shaAnterior: null }], "x")).rejects.toBeInstanceOf(
      ConflitoError,
    );
  });

  test("outra pessoa salva entre a leitura e o commit: o branch recusa (422) e vira conflito", async () => {
    github.antesDe("PATCH /git/refs/heads/main", () => github.salvarPorFora("content/edicoes/2026/edicao.json", "{}\n"));
    await expect(salvarArquivos([{ caminho: FICHA, conteudo: '{ "x": 1 }\n' }], "x")).rejects.toBeInstanceOf(ConflitoError);
    expect(github.texto(FICHA)).toBe('{ "nome": "Heaven Runner" }\n');
  });

  test("apagar o que não existe é ignorado; sem mudança nenhuma, não há commit", async () => {
    await apagarArquivos(["public/edicoes/2026/heaven-runner/protagonista.webp"], "x");
    expect(github.commits()).toBe(0);
    await apagarArquivos([FICHA, "public/edicoes/2026/heaven-runner/antagonista.webp"], "x");
    expect(github.commits()).toBe(1);
    expect(github.arquivos.has(FICHA)).toBe(false);
  });

  test("mover leva o arquivo sem baixar nada; destino gravado (imagem nova) vence", async () => {
    const novo = "public/edicoes/2026/heaven-runner-2/mundo.webp";
    await salvarArquivos([], "renomeia", { mover: [{ de: DESENHO, para: novo }] });
    expect(github.arquivos.has(DESENHO)).toBe(false);
    expect([...github.arquivos.get(novo)!]).toEqual([1, 2, 3]);
    expect(github.chamadas.some((c) => c === "POST /git/blobs")).toBe(false);

    const volta = DESENHO;
    await salvarArquivos([{ caminho: volta, conteudo: Buffer.from([7]) }], "x", { mover: [{ de: novo, para: volta }] });
    expect([...github.arquivos.get(volta)!]).toEqual([7]);
    expect(github.arquivos.has(novo)).toBe(false);
  });

  test("apagar não remove o que acabou de chegar pelo mover", async () => {
    const novo = "public/edicoes/2026/outro/mundo.webp";
    await salvarArquivos([], "x", { mover: [{ de: DESENHO, para: novo }], apagar: [novo, DESENHO] });
    expect(github.arquivos.has(novo)).toBe(true);
  });

  test("pasta conferida mudou (jogo novo no meio-tempo): conflito", async () => {
    const itens = await listarArquivos("content/edicoes/2026/jogos");
    github.salvarPorFora("content/edicoes/2026/jogos/novo.json", "{}\n");
    await expect(
      salvarArquivos([{ caminho: "content/edicoes/2026/edicao.json", conteudo: "{}\n" }], "x", {
        conferirPasta: { pasta: "content/edicoes/2026/jogos", itens },
      }),
    ).rejects.toBeInstanceOf(ConflitoError);
  });

  test("caminho fora das pastas liberadas é recusado antes de falar com o GitHub", async () => {
    await expect(salvarArquivos([{ caminho: "src/lib/esquema.ts", conteudo: "" }], "x")).rejects.toBeInstanceOf(
      CaminhoInvalidoError,
    );
    expect(github.chamadas).toEqual([]);
  });
});

describe("erros do GitHub", () => {
  test("token inválido vira mensagem clara", async () => {
    vi.stubEnv("GITHUB_TOKEN", "token-errado");
    await expect(lerArquivo(FICHA)).rejects.toThrow("Token do GitHub inválido ou expirado.");
  });

  test("resposta HTML (instabilidade) vira RepositorioError, e não erro de JSON", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>502</html>", { status: 502 }));
    await expect(lerArquivo(FICHA)).rejects.toBeInstanceOf(RepositorioError);
  });

  test("sem configuração, avisa o que falta", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    await expect(lerArquivo(FICHA)).rejects.toThrow(/GITHUB_TOKEN/);
  });
});
