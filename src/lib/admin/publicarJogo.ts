/**
 * Publicação de um jogo (novo, editado ou com slug trocado), sempre num único commit.
 * O servidor valida de novo tudo o que o navegador validou: é ele quem decide.
 */
import { jogoSchema, PADRAO_ANO } from "../esquema.ts";
import { caminhos } from "./caminhos.ts";
import { mensagemCommit } from "./commit.ts";
import { lerEdicao, listarJogos } from "./dados.ts";
import { NOMES_DESENHO, paraFormulario, TIPOS_DESENHO, type EntradaJogo, type TipoDesenho } from "./formularioJogo.ts";
import { formatarJson } from "./json.ts";
import { lerArquivo, salvarArquivos, shaDoGit } from "./repositorio.ts";
import { validarJogo, type ErroCampo } from "./validacaoJogo.ts";

export class ValidacaoError extends Error {
  readonly erros: ErroCampo[];
  constructor(erros: ErroCampo[], mensagem = "A ficha tem campos para corrigir.") {
    super(mensagem);
    this.name = "ValidacaoError";
    this.erros = erros;
  }
}

export type PedidoPublicacao = {
  ano: string;
  /** O que veio do formulário. Passa por paraFormulario para aceitar só o formato esperado. */
  entrada: unknown;
  /** Slug com que o jogo estava gravado; null para jogo novo. */
  slugOriginal: string | null;
  /** Sha da ficha quando o formulário foi aberto; null para jogo novo. */
  sha: string | null;
  autor: string;
  /** Desenhos novos, já conferidos e convertidos (processarImagem), que entram no mesmo commit. */
  desenhos?: Partial<Record<TipoDesenho, Buffer>>;
};

export async function publicarJogo(pedido: PedidoPublicacao) {
  const { ano, slugOriginal, sha, autor } = pedido;
  if (!PADRAO_ANO.test(ano)) throw new ValidacaoError([], "Edição inválida.");

  // A mesma leitura validada do painel: edição com erro de esquema também bloqueia.
  const [{ edicao, turmas, sha: shaEdicao }, slugs] = await Promise.all([lerEdicao(ano), listarJogos(ano)]);
  if (!edicao) {
    throw new ValidacaoError([], "O edicao.json desta edição não existe ou tem erro. Corrija a edição antes.");
  }
  // As turmas foram conferidas contra este edicao.json: se ele mudar até o commit
  // (ex.: turma renomeada agora), o commit é recusado em vez de gravar turma velha.
  const edicaoIgual = { caminho: caminhos.edicao(ano), sha: shaEdicao };

  const entrada: EntradaJogo = paraFormulario(pedido.entrada);
  const { erros, gravar } = validarJogo(entrada, {
    ano,
    turmas,
    slugsOcupados: slugs.filter((s) => s !== slugOriginal),
  });
  if (erros.length > 0) throw new ValidacaoError(erros);

  const slug = gravar.slug;
  const conteudo = formatarJson(gravar, jogoSchema);
  const destino = caminhos.jogo(ano, slug);
  // Desenhos que sobraram na pasta do slug (de um jogo apagado à mão, por exemplo)
  // não podem ser herdados por um jogo que chega a esse endereço.
  const orfaos = TIPOS_DESENHO.map((tipo) => caminhos.desenho(ano, slug, tipo));
  // Desenho novo vai direto para a pasta do slug final (no rename, ganha do "mover").
  const desenhos = TIPOS_DESENHO.flatMap((tipo) => {
    const dados = pedido.desenhos?.[tipo];
    return dados ? [{ caminho: caminhos.desenho(ano, slug, tipo), conteudo: dados }] : [];
  });

  let resultado: { commitUrl: string };
  if (!slugOriginal) {
    // Jogo novo: shaAnterior null garante que ninguém criou o mesmo slug no meio-tempo.
    resultado = await salvarArquivos(
      [{ caminho: destino, conteudo, shaAnterior: null }, ...desenhos],
      mensagemCommit(ano, "adiciona", slug, autor),
      { apagar: orfaos, conferir: [edicaoIgual] },
    );
  } else if (slugOriginal === slug) {
    resultado = await salvarArquivos(
      [{ caminho: destino, conteudo, shaAnterior: sha }, ...desenhos],
      mensagemCommit(ano, "edita", slug, autor),
      { conferir: [edicaoIgual] },
    );
  } else {
    // Slug trocado: ficha nova no lugar novo, a antiga sai, e os desenhos mudam de pasta.
    const origem = caminhos.jogo(ano, slugOriginal);
    resultado = await salvarArquivos(
      [{ caminho: destino, conteudo, shaAnterior: null }, ...desenhos],
      mensagemCommit(ano, "renomeia", `${slugOriginal} para ${slug}`, autor),
      {
        // O que chega pelo "mover" fica; o resto da pasta nova (órfãos) sai.
        apagar: [origem, ...orfaos],
        conferir: [{ caminho: origem, sha }, edicaoIgual],
        mover: TIPOS_DESENHO.map((tipo) => ({
          de: caminhos.desenho(ano, slugOriginal, tipo),
          para: caminhos.desenho(ano, slug, tipo),
        })),
      },
    );
  }

  return { slug, sha: shaDoGit(conteudo), commitUrl: resultado.commitUrl };
}

/**
 * Envia um desenho sozinho, num commit próprio. Usado quando os desenhos juntos
 * passariam do limite de uma requisição: a ficha é publicada antes, sem eles.
 */
export async function enviarDesenho(ano: string, slug: string, tipo: TipoDesenho, dados: Buffer, autor: string) {
  const ficha = caminhos.jogo(ano, slug);
  const atual = await lerArquivo(ficha);
  if (!atual) throw new ValidacaoError([], "Este jogo não existe mais. Recarregue a página.");
  // A conferência entra no commit: se o jogo for excluído ou renomeado entre a
  // leitura e a gravação, o desenho não fica órfão numa pasta sem ficha.
  return salvarArquivos(
    [{ caminho: caminhos.desenho(ano, slug, tipo), conteudo: dados }],
    mensagemCommit(ano, "envia", `${NOMES_DESENHO[tipo].toLowerCase()} de ${slug}`, autor),
    { conferir: [{ caminho: ficha, sha: atual.sha }] },
  );
}

/** Para o formulário de edição: a ficha atual pronta para os campos. */
export async function lerJogoParaFormulario(ano: string, slug: string) {
  const arquivo = await lerArquivo(caminhos.jogo(ano, slug));
  if (!arquivo) return null;
  try {
    return { entrada: paraFormulario(JSON.parse(arquivo.conteudo)), sha: arquivo.sha, erro: null };
  } catch (erro) {
    return { entrada: null, sha: arquivo.sha, erro: `JSON inválido: ${(erro as Error).message}` };
  }
}
