/**
 * Gravação do mentores.json, que é uma lista só para todos os mentores. Toda
 * mudança (adicionar, editar, excluir, reordenar) regrava o arquivo inteiro,
 * conferindo o sha: se outra pessoa salvou no meio-tempo, o commit é recusado.
 */
import { mentoresSchema } from "../esquema.ts";
import { caminhos } from "./caminhos.ts";
import { mensagemCommit } from "./commit.ts";
import { lerMentores } from "./dados.ts";
import { ValidacaoError } from "./formulario.ts";
import { paraFormularioMentor, slugDoMentor, validarMentor } from "./formularioMentor.ts";
import { formatarJson } from "./json.ts";
import { ConflitoError, salvarArquivos, shaDoGit, type ArquivoParaSalvar } from "./repositorio.ts";

type Ficha = Record<string, unknown>;

const nomeDa = (ficha: Ficha) => (typeof ficha.nome === "string" ? ficha.nome : "");

/** Lê de novo e confere se ninguém salvou desde que a pessoa abriu a tela. */
async function lerConferindo(sha: string) {
  const atual = await lerMentores();
  if (atual.erro) throw new ValidacaoError([], `${atual.erro} Corrija o arquivo pelo GitHub.`);
  if (atual.sha !== sha) throw new ConflitoError(caminhos.mentores());
  return atual.fichas;
}

function gravarLista(fichas: Ficha[], sha: string, extras: ArquivoParaSalvar[] = []) {
  const conteudo = formatarJson(fichas, mentoresSchema);
  return { conteudo, arquivos: [{ caminho: caminhos.mentores(), conteudo, shaAnterior: sha }, ...extras] };
}

type PedidoMentor = {
  entrada: unknown;
  /** Slug do mentor como estava gravado; null para mentor novo. */
  slugOriginal: string | null;
  sha: string;
  /** Foto nova, já conferida e convertida (processarFoto). */
  foto?: Buffer;
  autor: string;
};

export async function publicarMentor({ entrada, slugOriginal, sha, foto, autor }: PedidoMentor) {
  const fichas = await lerConferindo(sha);
  const indice = slugOriginal ? fichas.findIndex((f) => slugDoMentor(nomeDa(f)) === slugOriginal) : -1;
  if (slugOriginal && indice < 0) throw new ValidacaoError([], "Este mentor não existe mais. Recarregue a página.");

  const outros = fichas.filter((_, i) => i !== indice).map((f) => slugDoMentor(nomeDa(f)));
  const { erros, gravar } = validarMentor(paraFormularioMentor(entrada), outros);
  if (erros.length > 0) throw new ValidacaoError(erros);

  const slug = slugDoMentor(gravar.nome);
  // A ficha antiga por baixo: "disciplinas" e o que mais o admin não mostra continuam.
  const ficha = { ...(indice >= 0 ? fichas[indice] : {}), ...gravar };
  const novas = indice >= 0 ? fichas.map((f, i) => (i === indice ? ficha : f)) : [...fichas, ficha];

  const caminhoFoto = caminhos.fotoMentor(slug);
  const { conteudo, arquivos } = gravarLista(novas, sha, foto ? [{ caminho: caminhoFoto, conteudo: foto }] : []);
  const renomeado = slugOriginal !== null && slugOriginal !== slug;
  const acao = !slugOriginal ? "adiciona" : renomeado ? "renomeia" : "edita";
  const alvo = renomeado ? `${nomeDa(fichas[indice])} para ${gravar.nome}` : gravar.nome;

  const { commitUrl } = await salvarArquivos(arquivos, mensagemCommit("mentores", acao, alvo, autor), {
    // Nome trocado: a foto vai junto (se não veio uma nova no lugar).
    mover: renomeado ? [{ de: caminhos.fotoMentor(slugOriginal), para: caminhoFoto }] : [],
  });
  return { slug, sha: shaDoGit(conteudo), commitUrl };
}

export async function excluirMentor(slug: string, sha: string, autor: string) {
  const fichas = await lerConferindo(sha);
  const ficha = fichas.find((f) => slugDoMentor(nomeDa(f)) === slug);
  if (!ficha) throw new ValidacaoError([], "Este mentor já tinha sido excluído. Recarregue a página.");
  const { conteudo, arquivos } = gravarLista(fichas.filter((f) => f !== ficha), sha);
  const { commitUrl } = await salvarArquivos(arquivos, mensagemCommit("mentores", "exclui", nomeDa(ficha), autor), {
    apagar: [caminhos.fotoMentor(slug)],
  });
  return { sha: shaDoGit(conteudo), commitUrl };
}

/** Nova ordem, dada pelos slugs. Precisa ter exatamente os mesmos mentores. */
export async function reordenarMentores(ordem: string[], sha: string, autor: string) {
  const fichas = await lerConferindo(sha);
  const porSlug = new Map(fichas.map((f) => [slugDoMentor(nomeDa(f)), f]));
  if (ordem.length !== fichas.length || new Set(ordem).size !== ordem.length || !ordem.every((s) => porSlug.has(s))) {
    throw new ConflitoError(caminhos.mentores());
  }
  const { conteudo, arquivos } = gravarLista(ordem.map((s) => porSlug.get(s)!), sha);
  const { commitUrl } = await salvarArquivos(arquivos, mensagemCommit("mentores", "reordena", "a lista", autor));
  return { sha: shaDoGit(conteudo), commitUrl };
}
