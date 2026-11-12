import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormMentor } from "@/components/admin/FormMentor";
import { ErroTela, TelaJogo } from "@/components/admin/TelaJogo";
import { caminhos } from "@/lib/admin/caminhos";
import { paraFormularioMentor, slugDoMentor } from "@/lib/admin/formularioMentor";
import { lerMentores } from "@/lib/admin/dados";
import { listarArquivos } from "@/lib/admin/repositorio";
import { PADRAO_SLUG } from "@/lib/esquema";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Editar ${(await params).slug}` };
}

export default async function EditarMentor({ params }: Props) {
  const { slug } = await params;
  if (!PADRAO_SLUG.test(slug)) notFound();

  // Só a listagem da pasta: saber se a foto existe sem baixar a imagem.
  const [{ fichas, sha, erro }, fotos] = await Promise.all([lerMentores(), listarArquivos(caminhos.pastaFotos())]);
  const entradas = fichas.map(paraFormularioMentor);
  const mentor = entradas.find((m) => slugDoMentor(m.nome) === slug);
  if (!erro && !mentor) notFound();

  return (
    <TelaJogo titulo={`Editar ${mentor?.nome ?? slug}`} voltar={{ href: "/admin/mentores", texto: "Voltar à lista de mentores" }}>
      {erro || !sha || !mentor ? (
        <ErroTela>
          <p className="font-bold">{erro}</p>
        </ErroTela>
      ) : (
        <FormMentor
          inicial={mentor}
          sha={sha}
          slugOriginal={slug}
          outrosSlugs={entradas.map((m) => slugDoMentor(m.nome)).filter((s) => s !== slug)}
          temFoto={fotos.includes(caminhos.fotoMentor(slug))}
        />
      )}
    </TelaJogo>
  );
}
