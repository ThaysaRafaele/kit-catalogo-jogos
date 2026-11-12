import { describe, expect, test } from "vitest";
import { linhaCredito, paraFormularioEdicao, validarEdicao } from "../../src/lib/admin/formularioEdicao.ts";
import { gerarSlug, jogoVazio, paraFormulario, sugerirAlt } from "../../src/lib/admin/formularioJogo.ts";
import { paraFormularioMentor, paraGravarMentor, validarMentor } from "../../src/lib/admin/formularioMentor.ts";
import { formatarJson } from "../../src/lib/admin/json.ts";
import { validarJogo } from "../../src/lib/admin/validacaoJogo.ts";
import { edicaoSchema, jogoSchema, mentoresSchema } from "../../src/lib/esquema.ts";

/** Uma ficha no estilo das escritas à mão: listas curtas numa linha, desenho em várias. */
const FICHA = `{
  "slug": "heaven-runner",
  "turma": "2º G",
  "estudio": "Os três maiores",
  "nome": "Heaven Runner",
  "tema": "folclore",
  "genero": "Aventura",
  "plataforma": "Celular e PC",
  "frase": "Uma aventura pelos céus.",
  "sinopse": "Safira recupera o cajado.",
  "protagonista": {
    "nome": "Safira",
    "quemE": "Anja de cabelos loiros.",
    "habilidadeEspecial": "Regeneração.",
    "desenho": {
      "src": "/edicoes/2026/heaven-runner/protagonista.webp",
      "alt": "Safira, anja de cabelos loiros com asas."
    }
  },
  "antagonista": {
    "nome": "Lúcifer",
    "motivacao": "Recuperar o cajado.",
    "relacaoProtagonista": "Inimigos mortais.",
    "desenho": {
      "src": "/edicoes/2026/heaven-runner/antagonista.webp",
      "alt": "Lúcifer."
    }
  },
  "mundo": {
    "lugar": "Céu",
    "epoca": "Indefinida",
    "caracteristicas": [
      "Cores claras",
      "Nuvens e templos"
    ],
    "clima": "Celestial",
    "inspiracao": "O Céu das religiões",
    "desenho": {
      "src": "/edicoes/2026/heaven-runner/mundo.webp",
      "alt": "O Céu em cores claras."
    }
  },
  "controles": [
    { "acao": "Saltar, deslizar e desviar", "teclas": ["W", "A", "S", "D"] },
    { "acao": "Saltar (alternativo)", "teclas": ["←", "↑", "→", "↓"] },
    { "acao": "Coletar esferas (automático)", "teclas": [] }
  ],
  "desafio": "Bugs.",
  "solucao": "Ajuda de IAs.",
  "equipe": [
    { "nome": "Vitória", "funcao": "Programadora" },
    { "nome": "Pedro", "funcao": "Idealizador" }
  ],
  "autorizacaoImagem": true
}
`;

const CONTEXTO = { ano: "2026", turmas: ["2º G"], slugsOcupados: [] };

/** O caminho completo do navegador ao servidor: arquivo → tela → fetch (JSON) → servidor confere. */
function idaEVolta(bruto: string) {
  const naTela = paraFormulario(JSON.parse(bruto));
  const enviado = JSON.parse(JSON.stringify(naTela));
  const noServidor = paraFormulario(enviado);
  const { erros, gravar } = validarJogo(noServidor, CONTEXTO);
  return { naTela, noServidor, erros, arquivo: formatarJson(gravar, jogoSchema) };
}

describe("ficha do jogo", () => {
  test("abrir e publicar sem mudar nada grava o mesmo arquivo, byte a byte", () => {
    const { erros, arquivo } = idaEVolta(FICHA);
    expect(erros).toEqual([]);
    expect(arquivo).toBe(FICHA);
  });

  test("regressão: as teclas sobrevivem ao servidor conferir o que o formulário mandou", () => {
    const { naTela, noServidor } = idaEVolta(FICHA);
    expect(noServidor).toEqual(naTela);
    expect(noServidor.controles.map((c) => c.teclas)).toEqual(["W, A, S, D", "←, ↑, →, ↓", ""]);
  });

  test("PREENCHER vira campo vazio na tela", () => {
    const ficha = JSON.parse(FICHA);
    ficha.sinopse = "PREENCHER";
    expect(paraFormulario(ficha).sinopse).toBe("");
  });

  test("ficha vazia: erros só do que impede o build, na ordem da tela", () => {
    const { erros } = validarJogo(jogoVazio(), CONTEXTO);
    expect(erros.map((e) => e.id)).toEqual([
      "campo-turma",
      "campo-nome",
      "campo-slug",
      "campo-tema",
      "campo-protagonista-desenho-alt",
      "campo-antagonista-desenho-alt",
      "campo-mundo-desenho-alt",
    ]);
  });

  test("slug ocupado, reservado e com caractere inválido", () => {
    const base = paraFormulario(JSON.parse(FICHA));
    const erro = (slug: string, ocupados: string[] = []) =>
      validarJogo({ ...base, slug }, { ...CONTEXTO, slugsOcupados: ocupados }).erros.find((e) => e.id === "campo-slug")?.mensagem;
    expect(erro("heaven-runner", ["heaven-runner"])).toMatch(/Já existe/);
    expect(erro("novo")).toMatch(/reservado/);
    expect(erro("Heaven Runner")).toMatch(/minúsculas/);
    expect(erro("heaven-runner")).toBeUndefined();
  });

  test("linha pela metade (teclas sem ação, pessoa sem função) vira erro, e não some", () => {
    const e = paraFormulario(JSON.parse(FICHA));
    e.controles.push({ acao: "", teclas: "Espaço" });
    e.equipe.push({ nome: "Ana", funcao: "" });
    const ids = validarJogo(e, CONTEXTO).erros.map((x) => x.id);
    expect(ids).toContain("campo-controles-3-acao");
    expect(ids).toContain("campo-equipe-2-funcao");
  });

  test("link: vazio sai do arquivo; endereço precisa de http(s)", () => {
    const e = paraFormulario(JSON.parse(FICHA));
    expect(validarJogo({ ...e, link: "ftp://x" }, CONTEXTO).erros.map((x) => x.id)).toContain("campo-link");
    expect(validarJogo({ ...e, link: "" }, CONTEXTO).gravar.link).toBeUndefined();
  });

  test("slug gerado do nome e alt sugerido a partir da ficha", () => {
    expect(gerarSlug("Saci Pererê: A Volta!")).toBe("saci-perere-a-volta");
    const e = paraFormulario(JSON.parse(FICHA));
    expect(sugerirAlt(e, "protagonista")).toBe("Safira, Anja de cabelos loiros.");
    expect(sugerirAlt(e, "antagonista")).toBe("Lúcifer, antagonista que enfrenta Safira.");
    expect(sugerirAlt(jogoVazio(), "mundo")).toBe("");
  });
});

describe("formatarJson", () => {
  test("chaves na ordem do esquema; chave desconhecida vai no fim, sem se perder", () => {
    const texto = formatarJson({ titulo: "T", extra: 1, ano: 2026, textoAbertura: "x", turmas: [], creditos: [] }, edicaoSchema);
    expect(Object.keys(JSON.parse(texto))).toEqual(["ano", "titulo", "textoAbertura", "turmas", "creditos", "extra"]);
    expect(texto.endsWith("}\n")).toBe(true);
  });

  test("item de lista curto numa linha; longo ou objeto comum em várias", () => {
    const texto = formatarJson(
      {
        ano: 2026,
        titulo: "T",
        textoAbertura: "x",
        turmas: [{ id: "1º H" }],
        creditos: [
          { funcao: "Escola", nome: "CEEP" },
          { funcao: "Professores", nome: "Nome Bem Comprido ".repeat(6).trim() },
        ],
      },
      edicaoSchema,
    );
    expect(texto).toContain('    { "id": "1º H" }');
    expect(texto).toContain('    { "funcao": "Escola", "nome": "CEEP" }');
    expect(texto).toContain('      "funcao": "Professores",');
  });
});

describe("edição", () => {
  const EDICAO = {
    ano: 2026,
    titulo: "Mostra 2026",
    textoAbertura: "PREENCHER",
    turmas: [{ id: "1º H" }, { id: "2º G", lema: "Voar" }],
    creditos: [{ funcao: "Escola", nome: "CEEP" }],
  };

  test("ida e volta sem perda, e texto vazio continua PREENCHER", () => {
    const tela = paraFormularioEdicao(JSON.parse(JSON.stringify(paraFormularioEdicao(EDICAO))));
    const { erros, gravar } = validarEdicao(tela, 2026);
    expect(erros).toEqual([]);
    expect(gravar.textoAbertura).toBe("PREENCHER");
    expect(gravar.turmas).toEqual([{ id: "1º H" }, { id: "2º G", lema: "Voar" }]);
    expect(tela.turmas.map((t) => t.original)).toEqual(["1º H", "2º G"]);
  });

  test("turma repetida, sem nome, PREENCHER e crédito pela metade: um erro por campo, na linha certa", () => {
    const tela = paraFormularioEdicao(EDICAO);
    const turma = (id: string, lema = "") => ({ id, lema, mentor: "", original: null });
    // A linha vazia (3) não vai para o arquivo: os erros do esquema precisam continuar
    // apontando para as linhas da tela, e não para as do arquivo.
    tela.turmas.push(turma(""), turma("1º H"), turma("", "Sem nome"), turma("PREENCHER"));
    tela.creditos.push({ ...linhaCredito(), funcao: "Arte" });
    const erros = validarEdicao(tela, 2026).erros.map((e) => `${e.rotulo}: ${e.mensagem}`);
    expect(erros).toEqual([
      'Turma 4: nome: A turma "1º H" já está na lista.',
      "Turma 5: nome: Escreva o nome da turma (ex.: 2º G).",
      "Turma 6: nome: Escreva o nome da turma (ex.: 2º G).",
      "Crédito 2: nomes: Escreva os nomes deste crédito, ou remova a linha.",
    ]);
  });
});

describe("mentor", () => {
  const MENTOR = {
    nome: "Robin Bryan",
    foto: "/mentores/robin-bryan.webp",
    cargo: "professor",
    lider: false,
    classe: "Godot",
    skills: ["Artes Visuais"],
    specialAbility: "Master of the Engine",
    sideQuests: ["Streamer"],
    funFact: "Bronze no LoL",
    disciplinas: ["Lógica"],
  };

  test("ida e volta mantém a ficha; disciplinas (fora do formulário) continuam", () => {
    const tela = paraFormularioMentor(JSON.parse(JSON.stringify(paraFormularioMentor(MENTOR))));
    const { erros, gravar } = validarMentor(tela, []);
    expect(erros).toEqual([]);
    const ficha = { ...MENTOR, ...gravar };
    expect(ficha).toEqual(MENTOR);
    expect(mentoresSchema.safeParse(JSON.parse(formatarJson([ficha], mentoresSchema))).success).toBe(true);
  });

  test("nome repetido, sem cargo; texto vazio vira PREENCHER e a foto segue o nome", () => {
    const tela = { ...paraFormularioMentor(MENTOR), cargo: "" as const, classe: "" };
    expect(validarMentor(tela, ["robin-bryan"]).erros.map((e) => e.mensagem)).toEqual([
      "Já existe um mentor com este nome.",
      "Escolha o cargo.",
    ]);
    const gravar = paraGravarMentor({ ...tela, nome: "Ana Lúcia" });
    expect(gravar.classe).toBe("PREENCHER");
    expect(gravar.foto).toBe("/mentores/ana-lucia.webp");
  });
});
