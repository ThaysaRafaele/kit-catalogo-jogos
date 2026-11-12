/**
 * Peças comuns aos três formulários do admin (jogo, edição e mentor), no
 * navegador e no servidor: leitura do JSON, ids dos campos e coleta de erros.
 */
import { MARCADOR_VAZIO } from "../esquema.ts";

// ─── Leitores do JSON: aceitam qualquer coisa e devolvem sempre o tipo esperado ──

/** Objeto JSON comum (não null, não lista): o formato de toda ficha e edição. */
export function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Texto do JSON: o que não é texto, ou ainda tem "PREENCHER", vira campo vazio. */
export const texto = (valor: unknown) => (typeof valor === "string" && !valor.includes(MARCADOR_VAZIO) ? valor : "");
export const objeto = (valor: unknown) => (ehObjeto(valor) ? valor : {});
export const lista = (valor: unknown) => (Array.isArray(valor) ? valor : []);

// ─── Erros ────────────────────────────────────────────────────────────────────

export type ErroCampo = {
  /** Id do campo no formulário (também é o alvo do link no resumo de erros). */
  id: string;
  rotulo: string;
  mensagem: string;
};

type Caminho = (string | number)[];

/** Caminho do campo → id no formulário: ["protagonista", "nome"] → "campo-protagonista-nome". */
export function idDoCampo(caminho: readonly (string | number)[]): string {
  // Erro numa tecla aponta para o campo de teclas da linha (é um campo só no formulário).
  const i = caminho.indexOf("teclas");
  const util = i >= 0 ? caminho.slice(0, i + 1) : caminho;
  return ["campo", ...util].join("-");
}

/** Ficha recusada pelo servidor: os erros por campo, ou só a mensagem geral. */
export class ValidacaoError extends Error {
  readonly erros: ErroCampo[];
  constructor(erros: ErroCampo[], mensagem = "A ficha tem campos para corrigir.") {
    super(mensagem);
    this.name = "ValidacaoError";
    this.erros = erros;
  }
}

/** Índices na tela das linhas que vão para o arquivo (as linhas vazias ficam de fora). */
export const indicesPreenchidos = <T>(itens: T[], preenchida: (item: T) => boolean) =>
  itens.flatMap((item, i) => (preenchida(item) ? [i] : []));

type ResultadoDoEsquema = { success: true } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };

/**
 * Junta os erros de um formulário: um por campo (o primeiro vence), com o rótulo
 * que o formulário escolher. Os erros do esquema do build entram pelo mesmo lugar.
 */
export function coletorDeErros(rotular: (caminho: Caminho) => string) {
  const erros: ErroCampo[] = [];

  function adicionar(caminho: Caminho, mensagem: string) {
    const id = idDoCampo(caminho);
    if (!erros.some((erro) => erro.id === id)) erros.push({ id, rotulo: rotular(caminho), mensagem });
  }

  /**
   * O arquivo não tem as linhas vazias da tela: `indicesNaTela` (por lista) traduz o
   * índice do esquema de volta para o da tela, para o erro cair no campo certo.
   */
  function adicionarDoEsquema(
    resultado: ResultadoDoEsquema,
    {
      mensagens = {},
      indicesNaTela = {},
    }: { mensagens?: Record<string, string>; indicesNaTela?: Record<string, number[]> } = {},
  ) {
    if (resultado.success) return;
    for (const issue of resultado.error.issues) {
      const caminho = issue.path.filter((p): p is string | number => typeof p !== "symbol");
      const [nomeDaLista, indice] = caminho;
      const mapa = typeof nomeDaLista === "string" ? indicesNaTela[nomeDaLista] : undefined;
      if (mapa && typeof indice === "number") caminho[1] = mapa[indice] ?? indice;
      const chave = caminho.filter((p) => typeof p === "string").join(".");
      adicionar(caminho, mensagens[chave] ?? issue.message);
    }
  }

  return { erros, adicionar, adicionarDoEsquema };
}
