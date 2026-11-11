import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormEdicao } from "@/components/admin/FormEdicao";
import { ErroTela, TelaJogo } from "@/components/admin/TelaJogo";
import { caminhos } from "@/lib/admin/caminhos";
import { jogosDaEdicao, lerJson, nomesDosMentores } from "@/lib/admin/dados";
import { paraFormularioEdicao } from "@/lib/admin/formularioEdicao";
import { PADRAO_ANO } from "@/lib/esquema";

type Props = { params: Promise<{ ano: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Dados da edição ${(await params).ano}` };
}

export default async function DadosDaEdicao({ params }: Props) {
  const { ano } = await params;
  if (!PADRAO_ANO.test(ano)) notFound();

  const [lido, mentores, { jogos }] = await Promise.all([
    lerJson(caminhos.edicao(ano)),
    nomesDosMentores(),
    jogosDaEdicao(ano),
  ]);
  if (!lido) notFound();

  const jogosPorTurma: Record<string, number> = {};
  for (const { lido: jogo } of jogos) {
    const turma = "dados" in jogo ? jogo.dados.turma : undefined;
    if (typeof turma === "string") jogosPorTurma[turma] = (jogosPorTurma[turma] ?? 0) + 1;
  }

  return (
    <TelaJogo ano={ano} titulo={`Dados da edição ${ano}`}>
      {"erro" in lido ? (
        <ErroTela>
          <p className="font-bold">O edicao.json desta edição não pôde ser lido:</p>
          <p>{lido.erro}</p>
          <p className="mt-2">Corrija o arquivo content/edicoes/{ano}/edicao.json pelo GitHub.</p>
        </ErroTela>
      ) : (
        <FormEdicao
          ano={ano}
          inicial={paraFormularioEdicao(lido.dados)}
          sha={lido.sha}
          mentores={mentores}
          jogosPorTurma={jogosPorTurma}
        />
      )}
    </TelaJogo>
  );
}
