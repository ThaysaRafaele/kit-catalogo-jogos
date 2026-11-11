/**
 * Limpeza do JSON antes da validação, sem acesso a disco: quem chama diz como saber
 * se uma imagem existe. O build usa o disco (conteudo.ts); o admin, o GitHub.
 */
import { MARCADOR_VAZIO } from "./esquema.ts";

/** Recebe o src como está no JSON (ex.: "/edicoes/2026/x/mundo.webp"). */
export type ExisteImagem = (src: string) => boolean;

export type Pendencia = {
  /** Caminho do campo a partir da raiz do JSON, como ".protagonista.nome" ou ".equipe[Vitória].funcao". */
  campo: string;
  motivo: "preencher" | "vazio" | "imagem" | "lista";
  /** Para imagem: o src que não foi encontrado. */
  src?: string;
};

export type OpcoesLimpeza = {
  existeImagem: ExisteImagem;
  /**
   * Também conta texto vazio como pendência. O build não conta (o aluno pode ter
   * deixado o campo em branco de propósito); o painel do admin conta, para mostrar
   * tudo o que falta.
   */
  contarVazios?: boolean;
  /** Campos (pelo nome da chave) que podem ficar vazios ou com "PREENCHER" sem virar pendência. */
  opcionais?: Set<string>;
};

/** Listas que podem ficar vazias sem que isso seja uma pendência. */
const LISTAS_OPCIONAIS = new Set(["disciplinas", "teclas"]);
const CAMINHO_DE_IMAGEM = /\.(webp|png|jpe?g|gif|svg)$/i;

/** Texto vazio, ou lista/objeto sem nenhum conteúdo dentro. */
function vazio(valor: unknown): boolean {
  if (valor === "") return true;
  return typeof valor === "object" && valor !== null && Object.values(valor).every(vazio);
}

/**
 * Apara os textos e registra cada pendência. Campo com "PREENCHER" e imagem que não
 * existe viram texto vazio, e itens sem conteúdo saem das listas. As telas não
 * exibem o que ficou vazio.
 */
export function limparConteudo(bruto: unknown, opcoes: OpcoesLimpeza, pendencias: Pendencia[]): unknown {
  return limpar(bruto, "", "", opcoes, pendencias);
}

function limpar(atual: unknown, campo: string, chave: string, opcoes: OpcoesLimpeza, pendencias: Pendencia[]): unknown {
  if (typeof atual === "string") {
    const texto = atual.trim();
    const opcional = opcoes.opcionais?.has(chave) ?? false;
    if (texto.includes(MARCADOR_VAZIO)) {
      // Campo opcional com "PREENCHER" é o mesmo que vazio: não falta nada ali.
      if (!opcional) pendencias.push({ campo, motivo: "preencher" });
      return "";
    }
    if (CAMINHO_DE_IMAGEM.test(texto) && !opcoes.existeImagem(texto)) {
      pendencias.push({ campo, motivo: "imagem", src: texto });
      return "";
    }
    if (texto === "" && opcoes.contarVazios && !opcional) {
      pendencias.push({ campo, motivo: "vazio" });
    }
    return texto;
  }
  if (Array.isArray(atual)) {
    if (atual.length === 0 && !LISTAS_OPCIONAIS.has(chave)) {
      pendencias.push({ campo, motivo: "lista" });
    }
    return atual
      .map((item, i) => limpar(item, `${campo}[${item?.nome ?? i}]`, chave, opcoes, pendencias))
      .filter((item) => !vazio(item));
  }
  if (atual !== null && typeof atual === "object") {
    return Object.fromEntries(
      Object.entries(atual).map(([k, v]) => [k, limpar(v, `${campo}.${k}`, k, opcoes, pendencias)]),
    );
  }
  return atual;
}

/** Texto de uma pendência, no formato que o `npm run validar` mostra. */
export function descreverPendencia(arquivo: string, { campo, motivo, src }: Pendencia): string {
  const onde = `${arquivo}${campo}`;
  switch (motivo) {
    case "preencher":
      return `${onde}: campo a preencher`;
    case "imagem":
      return `${onde}: imagem não encontrada (${src}), usando placeholder`;
    case "lista":
      return `${onde}: lista vazia`;
    case "vazio":
      return `${onde}: campo vazio`;
  }
}
