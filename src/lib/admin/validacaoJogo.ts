/**
 * Validação do formulário do jogo. A mesma função roda no navegador (resposta
 * rápida, ao lado de cada campo) e no servidor (fonte da verdade: ele nunca grava
 * uma ficha que quebraria o build).
 */
import { jogoSchema, PADRAO_SLUG } from "../esquema.ts";
import { limparConteudo } from "../limpeza.ts";
import { paraGravar, type EntradaJogo } from "./formularioJogo.ts";
import { rotuloDoCampo } from "./rotulos.ts";

export type ErroCampo = {
  /** Id do campo no formulário (também é o alvo do link no resumo de erros). */
  id: string;
  rotulo: string;
  mensagem: string;
};

export type ContextoValidacao = {
  ano: string;
  /** Turmas cadastradas na edição. */
  turmas: string[];
  /** Slugs dos outros jogos da edição (sem o do próprio jogo). */
  slugsOcupados: string[];
};

/** Caminho do campo → id no formulário: ["protagonista", "nome"] → "campo-protagonista-nome". */
export function idDoCampo(caminho: readonly (string | number)[]): string {
  // Erro numa tecla aponta para o campo de teclas da linha (é um campo só no formulário).
  const i = caminho.indexOf("teclas");
  const util = i >= 0 ? caminho.slice(0, i + 1) : caminho;
  return ["campo", ...util].join("-");
}

/** Mensagens por campo, mais claras que as genéricas do zod. */
const MENSAGENS: Record<string, string> = {
  nome: "Escreva o nome do jogo.",
  slug: "Use só letras minúsculas sem acento, números e hífens, como heaven-runner.",
  tema: "Escolha o tema.",
  link: "Use o endereço completo, começando com https://",
  "protagonista.desenho.alt": "Descreva este desenho: é o que o leitor de tela lê no lugar da imagem.",
  "antagonista.desenho.alt": "Descreva este desenho: é o que o leitor de tela lê no lugar da imagem.",
  "mundo.desenho.alt": "Descreva este desenho: é o que o leitor de tela lê no lugar da imagem.",
  "mundo.caracteristicas": "No máximo 3 características.",
};

/** Endereços que já são telas do admin e não podem virar slug. */
const RESERVADOS = new Set(["novo"]);

export function validarJogo(entrada: EntradaJogo, ctx: ContextoValidacao) {
  const gravar = paraGravar(entrada, ctx.ano);
  const erros: ErroCampo[] = [];
  const adicionar = (caminho: (string | number)[], mensagem: string) => {
    const id = idDoCampo(caminho);
    if (erros.some((e) => e.id === id)) return;
    erros.push({ id, rotulo: rotuloDoCampo(`.${caminho.filter((p) => typeof p === "string").join(".")}`), mensagem });
  };

  // Na ordem da ficha, para o resumo de erros seguir a ordem da tela.
  if (!ctx.turmas.includes(gravar.turma)) adicionar(["turma"], "Escolha a turma.");
  if (!gravar.slug) adicionar(["slug"], "Preencha o endereço (ele é gerado a partir do nome do jogo).");
  else if (!PADRAO_SLUG.test(gravar.slug)) adicionar(["slug"], MENSAGENS.slug);
  else if (RESERVADOS.has(gravar.slug)) adicionar(["slug"], `"${gravar.slug}" é reservado. Escolha outro endereço.`);
  else if (ctx.slugsOcupados.includes(gravar.slug)) {
    adicionar(["slug"], "Já existe um jogo com este endereço nesta edição. Mude o endereço.");
  }

  // O esquema do build, sobre a ficha limpa do mesmo jeito que o build limpa.
  const resultado = jogoSchema.safeParse(limparConteudo(gravar, { existeImagem: () => true }, []));
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const caminho = issue.path.filter((p): p is string | number => typeof p !== "symbol");
      const chave = caminho.filter((p) => typeof p === "string").join(".");
      adicionar(caminho, MENSAGENS[chave] ?? issue.message);
    }
  }

  const ordem = (id: string) => ORDEM_DOS_CAMPOS.findIndex((prefixo) => id.startsWith(prefixo));
  erros.sort((a, b) => ordem(a.id) - ordem(b.id));
  return { erros, gravar };
}

/** Ordem dos grupos na tela, para ordenar o resumo de erros. */
const ORDEM_DOS_CAMPOS = [
  "campo-turma",
  "campo-estudio",
  "campo-nome",
  "campo-slug",
  "campo-tema",
  "campo-genero",
  "campo-plataforma",
  "campo-frase",
  "campo-sinopse",
  "campo-protagonista",
  "campo-antagonista",
  "campo-mundo",
  "campo-controles",
  "campo-desafio",
  "campo-solucao",
  "campo-equipe",
  "campo-link",
  "campo-autorizacaoImagem",
  "campo",
];
