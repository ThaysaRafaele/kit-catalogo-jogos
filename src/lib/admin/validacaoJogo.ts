/**
 * Validação do formulário do jogo. A mesma função roda no navegador (resposta
 * rápida, ao lado de cada campo) e no servidor (fonte da verdade: ele nunca grava
 * uma ficha que quebraria o build).
 */
import { jogoSchema, PADRAO_SLUG } from "../esquema.ts";
import { conferirComoBuild } from "../limpeza.ts";
import { coletorDeErros, indicesPreenchidos } from "./formulario.ts";
import { paraGravar, type EntradaJogo } from "./formularioJogo.ts";
import { rotuloDoCampo } from "./rotulos.ts";

type ContextoValidacao = {
  ano: string;
  /** Turmas cadastradas na edição. */
  turmas: string[];
  /** Slugs dos outros jogos da edição (sem o do próprio jogo). */
  slugsOcupados: string[];
};

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

/** "Equipe: função (linha 2)": de qual linha é o erro. */
function rotular(caminho: (string | number)[]) {
  const linha = caminho.find((p) => typeof p === "number");
  const rotulo = rotuloDoCampo(`.${caminho.filter((p) => typeof p === "string").join(".")}`);
  return typeof linha === "number" ? `${rotulo} (linha ${linha + 1})` : rotulo;
}

export function validarJogo(entrada: EntradaJogo, ctx: ContextoValidacao) {
  const gravar = paraGravar(entrada, ctx.ano);
  const { erros, adicionar, adicionarDoEsquema } = coletorDeErros(rotular);

  // Na ordem da ficha, para o resumo de erros seguir a ordem da tela.
  if (!ctx.turmas.includes(gravar.turma)) adicionar(["turma"], "Escolha a turma.");
  if (!gravar.slug) adicionar(["slug"], "Preencha o endereço (ele é gerado a partir do nome do jogo).");
  else if (!PADRAO_SLUG.test(gravar.slug)) adicionar(["slug"], MENSAGENS.slug);
  else if (RESERVADOS.has(gravar.slug)) adicionar(["slug"], `"${gravar.slug}" é reservado. Escolha outro endereço.`);
  else if (ctx.slugsOcupados.includes(gravar.slug)) {
    adicionar(["slug"], "Já existe um jogo com este endereço nesta edição. Mude o endereço.");
  }

  // Linha pela metade sumiria do catálogo sem aviso (o build descarta a linha).
  entrada.controles.forEach((c, i) => {
    if (!c.acao.trim() && c.teclas.trim()) adicionar(["controles", i, "acao"], "Escreva a ação destas teclas, ou remova a linha.");
  });
  entrada.equipe.forEach((p, i) => {
    if (p.nome.trim() && !p.funcao.trim()) adicionar(["equipe", i, "funcao"], "Escreva a função, ou remova a linha.");
    if (p.funcao.trim() && !p.nome.trim()) adicionar(["equipe", i, "nome"], "Escreva o primeiro nome, ou remova a linha.");
  });

  adicionarDoEsquema(conferirComoBuild(jogoSchema, gravar), {
    mensagens: MENSAGENS,
    indicesNaTela: {
      controles: indicesPreenchidos(entrada.controles, (c) => Boolean(c.acao.trim() || c.teclas.trim())),
      equipe: indicesPreenchidos(entrada.equipe, (p) => Boolean(p.nome.trim() || p.funcao.trim())),
    },
  });

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
