import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormJogo } from "@/components/admin/FormJogo";
import { ErroTela, TelaJogo } from "@/components/admin/TelaJogo";
import { contextoDoFormulario } from "@/lib/admin/dados";
import { jogoVazio } from "@/lib/admin/formularioJogo";
import { PADRAO_ANO } from "@/lib/esquema";

export const metadata: Metadata = { title: "Novo jogo" };

type Props = { params: Promise<{ ano: string }> };

export default async function NovoJogo({ params }: Props) {
  const { ano } = await params;
  if (!PADRAO_ANO.test(ano)) notFound();
  const contexto = await contextoDoFormulario(ano);
  if (contexto.semArquivo) notFound();

  return (
    <TelaJogo ano={ano} titulo={`Novo jogo da edição ${ano}`}>
      {contexto.erroEdicao ? (
        <ErroTela>
          <p className="font-bold">O edicao.json desta edição tem erro. Corrija a edição antes de incluir jogos.</p>
        </ErroTela>
      ) : contexto.turmas.length === 0 ? (
        <ErroTela>
          <p>
            Esta edição ainda não tem turmas. Cadastre as turmas em{" "}
            <a href={`/admin/${ano}/edicao`}>Dados da edição</a> antes de incluir jogos.
          </p>
        </ErroTela>
      ) : (
        <FormJogo
          ano={ano}
          turmas={contexto.turmas}
          slugsDaEdicao={contexto.slugs}
          imagens={contexto.imagens}
          inicial={jogoVazio()}
          sha={null}
          slugOriginal={null}
        />
      )}
    </TelaJogo>
  );
}
