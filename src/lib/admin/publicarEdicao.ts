/**
 * Publicação dos "Dados da edição". Turma renomeada leva os jogos dela junto, no
 * mesmo commit; turma removida que ainda tem jogos é recusada (o build quebraria
 * com "turma não existe").
 */
import { edicaoSchema, jogoSchema, PADRAO_ANO } from "../esquema.ts";
import { caminhos } from "./caminhos.ts";
import { mensagemCommit } from "./commit.ts";
import { jogosDaEdicao, lerJson } from "./dados.ts";
import { paraFormularioEdicao, validarEdicao } from "./formularioEdicao.ts";
import { formatarJson } from "./json.ts";
import { ValidacaoError } from "./publicarJogo.ts";
import { salvarArquivos, shaDoGit, type ArquivoParaSalvar } from "./repositorio.ts";

export async function publicarEdicao(ano: string, entradaBruta: unknown, sha: string, autor: string) {
  if (!PADRAO_ANO.test(ano)) throw new ValidacaoError([], "Edição inválida.");
  const entrada = paraFormularioEdicao(entradaBruta);
  const { erros, gravar } = validarEdicao(entrada, ano);
  if (erros.length > 0) throw new ValidacaoError(erros);

  const [atual, { arquivos, jogos }] = await Promise.all([lerJson(caminhos.edicao(ano)), jogosDaEdicao(ano)]);
  if (!atual) throw new ValidacaoError([], "Esta edição não tem edicao.json. Crie a edição pelo painel.");
  const dadosAtuais = "dados" in atual ? atual.dados : {};
  const idsAtuais = Array.isArray(dadosAtuais.turmas)
    ? dadosAtuais.turmas.map((t) => (t as { id?: unknown })?.id).filter((id): id is string => typeof id === "string")
    : [];

  // Renomeação: linha que veio do arquivo (original conhecido) com outro nome agora.
  const renomeadas = new Map<string, string>();
  const mantidas = new Set<string>();
  for (const turma of entrada.turmas) {
    const id = turma.id.trim();
    if (!id || !turma.original || !idsAtuais.includes(turma.original)) continue;
    mantidas.add(turma.original);
    if (turma.original !== id) renomeadas.set(turma.original, id);
  }
  const daTurma = (id: string) => jogos.filter(({ lido }) => "dados" in lido && lido.dados.turma === id);

  const bloqueios = idsAtuais
    .filter((id) => !mantidas.has(id) && daTurma(id).length > 0)
    .map((id) => {
      const slugs = daTurma(id).map((j) => j.slug);
      return `A turma "${id}" ainda tem ${slugs.length === 1 ? "1 jogo" : `${slugs.length} jogos`} (${slugs.join(", ")}). Mude a turma desses jogos antes de removê-la.`;
    });
  if (bloqueios.length > 0) throw new ValidacaoError([], bloqueios.join(" "));

  // Chave que o admin não conhece (acrescentada à mão no GitHub) continua no arquivo.
  const conteudo = formatarJson({ ...dadosAtuais, ...gravar }, edicaoSchema);
  const arquivosParaSalvar: ArquivoParaSalvar[] = [{ caminho: caminhos.edicao(ano), conteudo, shaAnterior: sha }];
  for (const [antigo, novo] of renomeadas) {
    for (const { slug, lido } of daTurma(antigo)) {
      if (!("dados" in lido)) continue;
      arquivosParaSalvar.push({
        caminho: caminhos.jogo(ano, slug),
        conteudo: formatarJson({ ...lido.dados, turma: novo }, jogoSchema),
        shaAnterior: lido.sha,
      });
    }
  }

  const resumo = [...renomeadas].map(([a, b]) => `"${a}" → "${b}"`).join(", ");
  const { commitUrl } = await salvarArquivos(
    arquivosParaSalvar,
    mensagemCommit(ano, "edita", resumo ? `a edição (turma ${resumo})` : "a edição", autor),
    // Um jogo criado agora numa turma renomeada ficaria com a turma velha: recusa.
    { conferirPasta: { pasta: caminhos.pastaJogos(ano), itens: arquivos } },
  );
  return { sha: shaDoGit(conteudo), commitUrl, jogosAtualizados: arquivosParaSalvar.length - 1 };
}
