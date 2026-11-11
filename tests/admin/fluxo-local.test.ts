/**
 * Fluxo completo do admin em ADMIN_MODO=local, numa cópia temporária do projeto:
 * publicar, renomear, mudar turma, excluir, mentores. No fim, o conteúdo gerado
 * passa pela mesma validação do build (carregarConteudo).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

const ORIGINAL = process.cwd();
let pasta: string;
// Os módulos guardam process.cwd() ao carregar: são importados já dentro da pasta temporária.
let m: {
  dados: typeof import("../../src/lib/admin/dados.ts");
  jogo: typeof import("../../src/lib/admin/publicarJogo.ts");
  edicao: typeof import("../../src/lib/admin/publicarEdicao.ts");
  mentor: typeof import("../../src/lib/admin/publicarMentor.ts");
  repo: typeof import("../../src/lib/admin/repositorio.ts");
  form: typeof import("../../src/lib/admin/formularioJogo.ts");
  imagem: typeof import("../../src/lib/admin/imagem.ts");
  conteudo: typeof import("../../src/lib/conteudo.ts");
};

const arquivo = (caminho: string) => path.join(pasta, ...caminho.split("/"));
const ler = (caminho: string) => readFileSync(arquivo(caminho), "utf8");
// Do conteúdo, e não do caminho: no Windows o sharp deixa o arquivo aberto e ele não pode ser apagado depois.
const medir = (caminho: string) => sharp(readFileSync(arquivo(caminho))).metadata();
const existe = (caminho: string) => existsSync(arquivo(caminho));
const sha = async (caminho: string) => (await m.repo.lerArquivo(caminho))!.sha;

function escrever(caminho: string, dados: unknown) {
  mkdirSync(path.dirname(arquivo(caminho)), { recursive: true });
  writeFileSync(arquivo(caminho), `${JSON.stringify(dados, null, 2)}\n`);
}

/** Uma ficha completa, como o formulário mandaria. */
function entrada(slug: string, turma: string, nome = "Jogo de Teste") {
  return {
    ...m.form.jogoVazio(turma),
    slug,
    nome,
    tema: "folclore" as const,
    protagonista: { nome: "Ana", quemE: "Heroína", habilidadeEspecial: "Voar", desenho: { src: "", alt: "Ana voando." } },
    antagonista: { nome: "Bruxa", motivacao: "Poder", relacaoProtagonista: "Rivais", desenho: { src: "", alt: "A bruxa." } },
    mundo: { ...m.form.jogoVazio().mundo, lugar: "Floresta", desenho: { src: "", alt: "Uma floresta." } },
    controles: [{ acao: "Pular", teclas: "Espaço" }],
    equipe: [{ nome: "Bia", funcao: "Arte" }],
    autorizacaoImagem: true,
  };
}

beforeAll(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "admin-fluxo-"));
  escrever("content/edicoes/2026/edicao.json", {
    ano: 2026,
    titulo: "Mostra 2026",
    textoAbertura: "Bem-vindos.",
    turmas: [{ id: "1º H" }, { id: "2º G" }],
    creditos: [{ funcao: "Escola", nome: "CEEP" }],
  });
  escrever("content/mentores.json", [
    {
      nome: "Robin Bryan",
      foto: "/mentores/robin-bryan.webp",
      cargo: "professor",
      lider: false,
      classe: "Godot",
      skills: ["Artes"],
      specialAbility: "Engine",
      sideQuests: [],
      funFact: "LoL",
      disciplinas: [],
    },
  ]);
  process.chdir(pasta);
  vi.stubEnv("ADMIN_MODO", "local");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.resetModules();
  m = {
    dados: await import("../../src/lib/admin/dados.ts"),
    jogo: await import("../../src/lib/admin/publicarJogo.ts"),
    edicao: await import("../../src/lib/admin/publicarEdicao.ts"),
    mentor: await import("../../src/lib/admin/publicarMentor.ts"),
    repo: await import("../../src/lib/admin/repositorio.ts"),
    form: await import("../../src/lib/admin/formularioJogo.ts"),
    imagem: await import("../../src/lib/admin/imagem.ts"),
    conteudo: await import("../../src/lib/conteudo.ts"),
  };
});

afterAll(() => {
  process.chdir(ORIGINAL);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(pasta, { recursive: true, force: true });
});

/**
 * Cada passo depende do anterior (o jogo publicado é o que depois é renomeado...).
 * Por isso é um teste só: se um passo falhar, a mensagem diz qual, e os seguintes
 * não viram falhas em cascata que escondem o motivo.
 */
async function passo(nome: string, executar: () => unknown) {
  try {
    await executar();
  } catch (erro) {
    if (erro instanceof Error) erro.message = `Passo "${nome}": ${erro.message}`;
    throw erro;
  }
}

test("fluxo completo: publicar, renomear, mudar turma, mentores, excluir e validar como o build", async () => {
  await passo("publica um jogo novo com desenho: ficha e WebP no lugar certo", async () => {
    const foto = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#ddd" } }).jpeg().toBuffer();
    const { slug } = await m.jogo.publicarJogo({
      ano: "2026",
      entrada: entrada("jogo-de-teste", "2º G"),
      slugOriginal: null,
      sha: null,
      autor: "Teste",
      desenhos: { mundo: await m.imagem.processarImagem(foto) },
    });
    expect(slug).toBe("jogo-de-teste");
    expect(JSON.parse(ler("content/edicoes/2026/jogos/jogo-de-teste.json")).turma).toBe("2º G");
    const meta = await medir("public/edicoes/2026/jogo-de-teste/mundo.webp");
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 1600, 800]);
  });

  await passo("o painel mostra o jogo, com os desenhos que faltam como pendência", async () => {
    const { jogos } = await m.dados.painelDaEdicao("2026");
    expect(jogos.map((j) => [j.slug, j.status])).toEqual([["jogo-de-teste", "pendente"]]);
    expect(jogos[0].pendencias).toContain("Protagonista: desenho não enviado");
  });

  await passo("jogo com o mesmo slug é recusado", async () => {
    await expect(
      m.jogo.publicarJogo({ ano: "2026", entrada: entrada("jogo-de-teste", "1º H"), slugOriginal: null, sha: null, autor: "T" }),
    ).rejects.toBeInstanceOf(m.jogo.ValidacaoError);
  });

  await passo("trocar o slug leva a ficha e o desenho", async () => {
    await m.jogo.publicarJogo({
      ano: "2026",
      entrada: entrada("jogo-renomeado", "2º G"),
      slugOriginal: "jogo-de-teste",
      sha: await sha("content/edicoes/2026/jogos/jogo-de-teste.json"),
      autor: "Teste",
    });
    expect(existe("content/edicoes/2026/jogos/jogo-de-teste.json")).toBe(false);
    expect(existe("public/edicoes/2026/jogo-de-teste/mundo.webp")).toBe(false);
    expect(existe("public/edicoes/2026/jogo-renomeado/mundo.webp")).toBe(true);
  });

  await passo("renomear a turma leva os jogos; remover turma com jogo é recusado", async () => {
    const turmas = (nomes: [string, string | null][]) =>
      nomes.map(([id, original]) => ({ id, lema: "", mentor: "", original }));
    const base = { titulo: "Mostra 2026", textoAbertura: "Bem-vindos.", agradecimento: "", creditos: [{ funcao: "Escola", nome: "CEEP" }] };

    const r = await m.edicao.publicarEdicao(
      "2026",
      { ...base, turmas: turmas([["1º H", "1º H"], ["2º G Manhã", "2º G"]]) },
      await sha("content/edicoes/2026/edicao.json"),
      "Teste",
    );
    expect(r.jogosAtualizados).toBe(1);
    expect(JSON.parse(ler("content/edicoes/2026/jogos/jogo-renomeado.json")).turma).toBe("2º G Manhã");

    await expect(
      m.edicao.publicarEdicao("2026", { ...base, turmas: turmas([["1º H", "1º H"]]) }, await sha("content/edicoes/2026/edicao.json"), "T"),
    ).rejects.toThrow(/ainda tem 1 jogo/);
  });

  await passo("mentores: adiciona com foto, reordena e exclui; disciplinas do Robin ficam", async () => {
    const foto = await m.imagem.processarFoto(
      await sharp({ create: { width: 800, height: 600, channels: 3, background: "#a55" } }).png().toBuffer(),
    );
    const novo = { nome: "Ana Lúcia", cargo: "professor", lider: true, classe: "Arte", skills: ["Artes"], specialAbility: "Desenho", sideQuests: [], funFact: "Gatos" };
    await m.mentor.publicarMentor({ entrada: novo, slugOriginal: null, sha: await sha("content/mentores.json"), foto, autor: "T" });
    const meta = await medir("public/mentores/ana-lucia.webp");
    expect([meta.width, meta.height]).toEqual([192, 192]);

    await m.mentor.reordenarMentores(["ana-lucia", "robin-bryan"], await sha("content/mentores.json"), "T");
    expect(JSON.parse(ler("content/mentores.json")).map((x: { nome: string }) => x.nome)).toEqual(["Ana Lúcia", "Robin Bryan"]);

    await m.mentor.excluirMentor("ana-lucia", await sha("content/mentores.json"), "T");
    expect(existe("public/mentores/ana-lucia.webp")).toBe(false);
    expect(JSON.parse(ler("content/mentores.json"))).toEqual([expect.objectContaining({ nome: "Robin Bryan", disciplinas: [] })]);
  });

  await passo("o conteúdo gerado passa na mesma validação do build", () => {
    const { edicoes, mentores } = m.conteudo.carregarConteudo();
    expect(edicoes[0].jogos.map((j) => j.slug)).toEqual(["jogo-renomeado"]);
    expect(edicoes[0].turmas.map((t) => t.id)).toEqual(["1º H", "2º G Manhã"]);
    expect(mentores).toHaveLength(1);
  });

  await passo("excluir apaga a ficha e os desenhos", async () => {
    await m.repo.apagarArquivos(
      ["content/edicoes/2026/jogos/jogo-renomeado.json", "public/edicoes/2026/jogo-renomeado/mundo.webp"],
      "exclui",
      [{ caminho: "content/edicoes/2026/jogos/jogo-renomeado.json", sha: await sha("content/edicoes/2026/jogos/jogo-renomeado.json") }],
    );
    expect(await m.dados.listarJogos("2026")).toEqual([]);
  });
});
