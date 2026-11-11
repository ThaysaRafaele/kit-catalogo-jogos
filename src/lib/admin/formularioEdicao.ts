/**
 * Ponte entre o edicao.json e o formulário "Dados da edição". Roda no navegador e
 * no servidor, como o formulário do jogo.
 */
import { edicaoSchema, MARCADOR_VAZIO } from "../esquema.ts";
import { limparConteudo } from "../limpeza.ts";
import { lista, objeto, texto } from "./formularioJogo.ts";
import { rotuloDoCampo } from "./rotulos.ts";
import { idDoCampo, type ErroCampo } from "./validacaoJogo.ts";

export type LinhaTurma = {
  id: string;
  lema: string;
  mentor: string;
  /**
   * Nome da turma quando o formulário foi aberto (null para turma nova). Se o nome
   * mudar, o servidor leva os jogos da turma junto.
   */
  original: string | null;
};

export type EntradaEdicao = {
  titulo: string;
  textoAbertura: string;
  agradecimento: string;
  turmas: LinhaTurma[];
  creditos: { funcao: string; nome: string }[];
};

export const linhaTurma = (): LinhaTurma => ({ id: "", lema: "", mentor: "", original: null });
export const linhaCredito = () => ({ funcao: "", nome: "" });

/** edicao.json (ou o que o formulário mandou) → estado do formulário. Aplicar duas vezes não muda nada. */
export function paraFormularioEdicao(bruto: unknown): EntradaEdicao {
  const e = objeto(bruto);
  const turmas = lista(e.turmas).map((t) => {
    const turma = objeto(t);
    const id = texto(turma.id);
    // Vindo do arquivo, não há "original": o próprio nome é o original.
    const original = "original" in turma ? (typeof turma.original === "string" ? turma.original : null) : id || null;
    return { id, lema: texto(turma.lema), mentor: texto(turma.mentor), original };
  });
  const creditos = lista(e.creditos).map((c) => ({ funcao: texto(objeto(c).funcao), nome: texto(objeto(c).nome) }));
  return {
    titulo: texto(e.titulo),
    textoAbertura: texto(e.textoAbertura),
    agradecimento: texto(e.agradecimento),
    turmas: turmas.length > 0 ? turmas : [linhaTurma()],
    creditos: creditos.length > 0 ? creditos : [linhaCredito()],
  };
}

/**
 * Estado do formulário → edicao.json. Texto vazio vira "PREENCHER", como no fluxo
 * das fichas: o `npm run validar` continua avisando o que falta. Lema e mentor
 * vazios não entram no arquivo.
 */
export function paraGravarEdicao(e: EntradaEdicao, ano: string | number) {
  const t = (valor: string) => valor.trim();
  return {
    ano: Number(ano),
    titulo: t(e.titulo),
    textoAbertura: t(e.textoAbertura) || MARCADOR_VAZIO,
    agradecimento: t(e.agradecimento) || MARCADOR_VAZIO,
    turmas: e.turmas
      .filter((turma) => t(turma.id) || t(turma.lema) || t(turma.mentor))
      .map((turma) => ({ id: t(turma.id), lema: t(turma.lema) || undefined, mentor: t(turma.mentor) || undefined })),
    creditos: e.creditos.map((c) => ({ funcao: t(c.funcao), nome: t(c.nome) })).filter((c) => c.funcao || c.nome),
  };
}

/** "Turma 2: nome", "Crédito 1: nomes": de qual linha é o erro. */
function rotuloDoErro(caminho: (string | number)[]) {
  const [lista, indice, campo] = caminho;
  const chave = `.${caminho.filter((p) => typeof p === "string").join(".")}`;
  if (typeof indice !== "number") return rotuloDoCampo(chave);
  const nome = lista === "turmas" ? "Turma" : "Crédito";
  return `${nome} ${indice + 1}: ${rotuloDoCampo(`.${String(lista)}.${String(campo)}`).replace(/^[^:]+: /, "")}`;
}

export function validarEdicao(e: EntradaEdicao, ano: string | number) {
  const gravar = paraGravarEdicao(e, ano);
  const erros: ErroCampo[] = [];
  const adicionar = (caminho: (string | number)[], mensagem: string) => {
    const id = idDoCampo(caminho);
    if (!erros.some((erro) => erro.id === id)) erros.push({ id, rotulo: rotuloDoErro(caminho), mensagem });
  };

  if (!gravar.titulo) adicionar(["titulo"], "Escreva o título da edição.");

  // Índices da tela (com as linhas vazias), para o link do erro cair no campo certo.
  const vistos = new Set<string>();
  e.turmas.forEach((turma, i) => {
    const id = turma.id.trim();
    if (!id && !turma.lema.trim() && !turma.mentor.trim()) return;
    // "PREENCHER" vira nome vazio no build: para a turma, é o mesmo que não ter nome.
    if (!id || id.includes(MARCADOR_VAZIO)) adicionar(["turmas", i, "id"], "Escreva o nome da turma (ex.: 2º G).");
    else if (vistos.has(id)) adicionar(["turmas", i, "id"], `A turma "${id}" já está na lista.`);
    vistos.add(id);
  });

  // Crédito pela metade sumiria do catálogo sem aviso (o build descarta a linha).
  e.creditos.forEach((credito, i) => {
    const funcao = credito.funcao.trim();
    const nome = credito.nome.trim();
    if (funcao && !nome) adicionar(["creditos", i, "nome"], "Escreva os nomes deste crédito, ou remova a linha.");
    if (nome && !funcao) adicionar(["creditos", i, "funcao"], "Escreva a função deste crédito, ou remova a linha.");
  });

  // E o esquema do build, sempre: o resumo mostra todos os problemas de uma vez.
  // O arquivo não tem as linhas vazias da tela: o índice do esquema volta a ser o da tela,
  // para o erro cair no mesmo campo do aviso acima (e não aparecer duas vezes).
  const naTela = {
    turmas: e.turmas.flatMap((t, i) => (t.id.trim() || t.lema.trim() || t.mentor.trim() ? [i] : [])),
    creditos: e.creditos.flatMap((c, i) => (c.funcao.trim() || c.nome.trim() ? [i] : [])),
  };
  const resultado = edicaoSchema.safeParse(limparConteudo(gravar, { existeImagem: () => true }, []));
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const caminho = issue.path.filter((p): p is string | number => typeof p !== "symbol");
      const [lista, indice] = caminho;
      if ((lista === "turmas" || lista === "creditos") && typeof indice === "number") {
        caminho[1] = naTela[lista][indice] ?? indice;
      }
      adicionar(caminho, issue.message);
    }
  }
  return { erros, gravar };
}
