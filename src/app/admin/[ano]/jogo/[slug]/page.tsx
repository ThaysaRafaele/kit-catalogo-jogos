import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormJogo } from "@/components/admin/FormJogo";
import { ErroTela, TelaJogo } from "@/components/admin/TelaJogo";
import { contextoDoFormulario } from "@/lib/admin/dados";
import { lerJogoParaFormulario } from "@/lib/admin/publicarJogo";
import { PADRAO_ANO, PADRAO_SLUG } from "@/lib/esquema";

type Props = { params: Promise<{ ano: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Editar ${slug}` };
}

export default async function EditarJogo({ params }: Props) {
  const { ano, slug } = await params;
  if (!PADRAO_ANO.test(ano) || !PADRAO_SLUG.test(slug)) notFound();

  const [contexto, jogo] = await Promise.all([contextoDoFormulario(ano), lerJogoParaFormulario(ano, slug)]);
  if (!jogo) notFound();

  return (
    <TelaJogo ano={ano} titulo={`Editar ${jogo.entrada?.nome || slug}`}>
      {jogo.erro || !jogo.entrada ? (
        <ErroTela>
          <p className="font-bold">A ficha deste jogo não pôde ser lida:</p>
          <p>{jogo.erro}</p>
          <p className="mt-2">Corrija o arquivo content/edicoes/{ano}/jogos/{slug}.json pelo GitHub.</p>
        </ErroTela>
      ) : (
        <>
          {contexto.erroEdicao && (
            <ErroTela>
              <p className="font-bold">O edicao.json desta edição tem erro: a publicação vai ser recusada.</p>
            </ErroTela>
          )}
          <FormJogo
            ano={ano}
            turmas={contexto.turmas}
            slugsDaEdicao={contexto.slugs}
            imagens={contexto.imagens}
            inicial={jogo.entrada}
            sha={jogo.sha}
            slugOriginal={slug}
          />
        </>
      )}
    </TelaJogo>
  );
}
