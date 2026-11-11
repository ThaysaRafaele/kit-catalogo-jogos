import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CaminhoInvalidoError, validarCaminho, validarPasta } from "../../src/lib/admin/caminhos.ts";
import { liberarTentativa, MAX_ERROS, MAX_ERROS_IP, reservarTentativa } from "../../src/lib/admin/limite.ts";
import { destinoSeguro, origemValida } from "../../src/lib/admin/origem.ts";
import { gerarHash, verificarSenha } from "../../src/lib/admin/senha.ts";
import { assinarSessao, verificarSessao, VALIDADE_SEGUNDOS } from "../../src/lib/admin/sessao.ts";

describe("senha", () => {
  test("gera hash scrypt com salt e confere a senha certa", async () => {
    const hash = await gerarHash("senha-de-teste-123");
    expect(hash).toMatch(/^scrypt:16384:8:1:[\w-]+:[\w-]+$/);
    expect(await verificarSenha("senha-de-teste-123", hash)).toBe(true);
    expect(await verificarSenha("senha-errada", hash)).toBe(false);
  });

  test("o mesmo texto gera hashes diferentes (salt aleatório)", async () => {
    expect(await gerarHash("igual")).not.toBe(await gerarHash("igual"));
  });

  test("sem $ no hash: o .env.local do Next não estraga a linha", async () => {
    expect(await gerarHash("x")).not.toContain("$");
  });

  test("acento digitado de jeitos diferentes (NFC e NFD) é a mesma senha", async () => {
    const hash = await gerarHash("pão de queijo");
    expect(await verificarSenha("pão de queijo".normalize("NFD"), hash)).toBe(true);
  });

  test("hash adulterado ou malformado nunca confere", async () => {
    const hash = await gerarHash("abc");
    const partes = hash.split(":");
    partes[5] = partes[5].replace(/^./, (c) => (c === "A" ? "B" : "A"));
    expect(await verificarSenha("abc", partes.join(":"))).toBe(false);
    expect(await verificarSenha("abc", "scrypt$16384$8$1$x$y")).toBe(false);
    expect(await verificarSenha("abc", "")).toBe(false);
  });
});

describe("sessão (cookie assinado)", () => {
  beforeEach(() => vi.stubEnv("ADMIN_SESSAO_SEGREDO", "um-segredo-de-teste-com-mais-de-32-caracteres"));
  afterEach(() => vi.unstubAllEnvs());

  test("assina e confere", () => {
    const cookie = assinarSessao("thay", "Thaysa");
    expect(verificarSessao(cookie)).toMatchObject({ usuario: "thay", nome: "Thaysa" });
  });

  test("vence em 8 horas", () => {
    const agora = Date.now();
    const cookie = assinarSessao("thay", "Thaysa", agora);
    expect(verificarSessao(cookie, agora + (VALIDADE_SEGUNDOS - 60) * 1000)).not.toBeNull();
    expect(verificarSessao(cookie, agora + VALIDADE_SEGUNDOS * 1000)).toBeNull();
  });

  test("dados trocados (outro usuário) com a assinatura velha são recusados", () => {
    const [, assinatura] = assinarSessao("thay", "Thaysa").split(".");
    const falso = Buffer.from(JSON.stringify({ usuario: "admin", nome: "X", exp: 9e9 })).toString("base64url");
    expect(verificarSessao(`${falso}.${assinatura}`)).toBeNull();
  });

  test("assinatura de outro segredo é recusada", () => {
    const cookie = assinarSessao("thay", "Thaysa");
    vi.stubEnv("ADMIN_SESSAO_SEGREDO", "outro-segredo-de-teste-com-mais-de-32-caracteres");
    expect(verificarSessao(cookie)).toBeNull();
  });

  test("lixo no cookie não quebra", () => {
    for (const lixo of ["", "a", "a.b.c", ".", "%%%.%%%"]) expect(verificarSessao(lixo)).toBeNull();
    expect(verificarSessao(undefined)).toBeNull();
  });

  test("sem segredo configurado, ninguém fica logado (e nada quebra)", () => {
    const cookie = assinarSessao("thay", "Thaysa");
    vi.stubEnv("ADMIN_SESSAO_SEGREDO", "curto");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(verificarSessao(cookie)).toBeNull();
    expect(() => assinarSessao("thay", "Thaysa")).toThrow(/32 caracteres/);
  });
});

describe("limite de tentativas", () => {
  test("5 erros por IP + usuário; outro usuário no mesmo IP continua liberado", () => {
    const agora = 1_000_000;
    for (let i = 0; i < MAX_ERROS; i++) expect(reservarTentativa("10.0.0.1", "thay", agora)).toBe(0);
    expect(reservarTentativa("10.0.0.1", "thay", agora)).toBe(15);
    expect(reservarTentativa("10.0.0.1", "jean", agora)).toBe(0);
    // Depois de 15 minutos, libera.
    expect(reservarTentativa("10.0.0.1", "thay", agora + 15 * 60 * 1000)).toBe(0);
  });

  test("tentativas em paralelo contam antes da conferência da senha", () => {
    const resultados = Array.from({ length: 20 }, () => reservarTentativa("10.0.0.2", "ana", 2_000_000));
    expect(resultados.filter((r) => r === 0)).toHaveLength(MAX_ERROS);
  });

  test("login certo limpa os erros daquele usuário", () => {
    const agora = 3_000_000;
    for (let i = 0; i < MAX_ERROS - 1; i++) reservarTentativa("10.0.0.3", "ana", agora);
    reservarTentativa("10.0.0.3", "ana", agora + 1);
    liberarTentativa("10.0.0.3", "ana", agora + 1);
    expect(reservarTentativa("10.0.0.3", "ana", agora + 2)).toBe(0);
  });

  test("30 erros no mesmo IP, em usuários diferentes, bloqueiam o IP", () => {
    const agora = 4_000_000;
    for (let i = 0; i < MAX_ERROS_IP; i++) reservarTentativa("10.0.0.4", `u${i}`, agora);
    expect(reservarTentativa("10.0.0.4", "outro", agora)).toBeGreaterThan(0);
  });
});

describe("origem (CSRF) e destino depois do login", () => {
  const cabecalhos = (valores: Record<string, string>) => new Headers(valores);

  test("só aceita pedido vindo do próprio site", () => {
    expect(origemValida(cabecalhos({ origin: "https://site.com", host: "site.com" }))).toBe(true);
    expect(origemValida(cabecalhos({ origin: "https://malicioso.com", host: "site.com" }))).toBe(false);
    expect(origemValida(cabecalhos({ host: "site.com" }))).toBe(false);
    expect(origemValida(cabecalhos({ origin: "lixo", host: "site.com" }))).toBe(false);
  });

  test("x-forwarded-host com vários proxies: vale o primeiro", () => {
    expect(origemValida(cabecalhos({ origin: "https://site.com", "x-forwarded-host": "site.com, interno" }))).toBe(true);
  });

  test("o ?volta= do login só leva para dentro do admin", () => {
    expect(destinoSeguro("/admin/2026/jogo/novo")).toBe("/admin/2026/jogo/novo");
    for (const ruim of ["https://malicioso.com", "//malicioso.com", "/2026", "/admin/login", "/admin\\..", null]) {
      expect(destinoSeguro(ruim)).toBe("/admin");
    }
  });
});

describe("caminhos de escrita", () => {
  test("aceita só as pastas liberadas, com a extensão certa", () => {
    expect(validarCaminho("content/edicoes/2026/jogos/heaven-runner.json")).toBeTruthy();
    expect(validarCaminho("public/edicoes/2026/heaven-runner/mundo.webp")).toBeTruthy();
    expect(validarCaminho("public/mentores/thaysa-rafaele.webp")).toBeTruthy();
  });

  test.each([
    ["content/../package.json", "trecho inválido"],
    ["/etc/passwd", "caminho absoluto"],
    ["C:/Windows/x.json", "caminho absoluto"],
    ["content\\edicoes\\x.json", "caractere proibido"],
    ["src/lib/esquema.ts", "fora das pastas liberadas"],
    ["public/x.js", "fora das pastas liberadas"],
    ["content/edicoes/2026/jogos/x.js", "extensão não permitida"],
    ["public/edicoes/2026/x/mundo.png", "extensão não permitida"],
    ["content//x.json", "trecho inválido"],
    ["content/edicoes/Ano 2026/x.json", "nome com caractere não permitido"],
  ])("recusa %s", (caminho, motivo) => {
    expect(() => validarCaminho(caminho)).toThrow(CaminhoInvalidoError);
    expect(() => validarCaminho(caminho)).toThrow(motivo);
  });

  test("leitura e listagem seguem a mesma regra de pasta", () => {
    expect(validarPasta("content/edicoes")).toBe("content/edicoes");
    expect(validarPasta("public/mentores/")).toBe("public/mentores");
    expect(() => validarPasta("src")).toThrow(CaminhoInvalidoError);
    expect(() => validarPasta("content/..")).toThrow(CaminhoInvalidoError);
  });
});
