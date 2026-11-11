import { NextResponse, type NextRequest } from "next/server";
import { caminhos } from "@/lib/admin/caminhos";
import { mensagemCommit } from "@/lib/admin/commit";
import { lerJson, listarAnos } from "@/lib/admin/dados";
import { formatarJson } from "@/lib/admin/json";
import { lerArquivo, salvarArquivos } from "@/lib/admin/repositorio";
import { exigirSessao, respostaDeFalha, respostaErro } from "@/lib/admin/servidor";
import { edicaoSchema, MARCADOR_VAZIO, PADRAO_ANO } from "@/lib/esquema";
import { limparConteudo } from "@/lib/limpeza";

export const runtime = "nodejs";

/**
 * Cria content/edicoes/<ano>/edicao.json a partir de um modelo. Os créditos vêm da
 * edição mais recente (a equipe costuma ser a mesma); turmas e textos ficam para
 * preencher na tela da edição. A página pública só aparece quando entrar o
 * primeiro jogo (veja generateStaticParams em src/app/[ano]/page.tsx).
 */
export async function POST(req: NextRequest) {
  const sessao = exigirSessao(req);
  if (sessao instanceof NextResponse) return sessao;

  const corpo = (await req.json().catch(() => null)) as { ano?: unknown; titulo?: unknown } | null;
  const ano = String(corpo?.ano ?? "").trim();
  const titulo = typeof corpo?.titulo === "string" ? corpo.titulo.trim() : "";
  if (!PADRAO_ANO.test(ano) || Number(ano) < 2000 || Number(ano) > 2100) {
    return respostaErro("Informe o ano com 4 dígitos, por exemplo 2027.", 400);
  }
  if (!titulo || titulo.includes(MARCADOR_VAZIO)) return respostaErro("Informe o título da edição.", 400);

  try {
    // Vale o edicao.json, não a pasta: uma pasta só com jogos ou imagens ainda pode ganhar o seu.
    if (await lerArquivo(caminhos.edicao(ano))) return respostaErro(`A edição ${ano} já existe.`, 409);

    // Créditos da edição mais recente que tenha um edicao.json legível.
    let creditosAnteriores: unknown;
    for (const outro of await listarAnos()) {
      const lido = await lerJson(caminhos.edicao(outro));
      if (lido && "dados" in lido) {
        creditosAnteriores = lido.dados.creditos;
        break;
      }
    }

    const modelo = {
      ano: Number(ano),
      titulo,
      textoAbertura: MARCADOR_VAZIO,
      agradecimento: MARCADOR_VAZIO,
      turmas: [],
      creditos: Array.isArray(creditosAnteriores) ? creditosAnteriores : [],
    };

    // O servidor nunca grava JSON que quebraria o build.
    const conferido = edicaoSchema.safeParse(limparConteudo(modelo, { existeImagem: () => true }, []));
    if (!conferido.success) return respostaErro("O modelo da edição ficou inválido.", 500);

    const { commitUrl } = await salvarArquivos(
      [{ caminho: caminhos.edicao(ano), conteudo: formatarJson(modelo, edicaoSchema), shaAnterior: null }],
      mensagemCommit(ano, "cria", "a edição", sessao.nome),
    );
    return NextResponse.json({ ok: true, ano, commitUrl });
  } catch (erro) {
    return respostaDeFalha(erro);
  }
}
