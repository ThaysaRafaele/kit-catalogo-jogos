import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormMentor } from "@/components/admin/FormMentor";
import { estilos } from "@/components/admin/estilos";
import { ErroTela } from "@/components/admin/TelaJogo";
import { caminhos } from "@/lib/admin/caminhos";
import { paraFormularioMentor, slugDoMentor } from "@/lib/admin/formularioMentor";
import { lerMentores } from "@/lib/admin/publicarMentor";
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
  const [{ fichas, sha, erro }, fotos] = await Promise.all([lerMentores(), listarArquivos("public/mentores")]);
  const entradas = fichas.map(paraFormularioMentor);
  const mentor = entradas.find((m) => slugDoMentor(m.nome) === slug);
  if (!erro && !mentor) notFound();

  return (
    <div className="flex flex-col gap-6">
      <p>
        <a href="/admin/mentores">← Voltar à lista de mentores</a>
      </p>
      <h1 className={estilos.titulo}>Editar {mentor?.nome ?? slug}</h1>
      {erro || !sha || !mentor ? (
        <ErroTela>
          <p className="font-bold">{erro ?? "O arquivo content/mentores.json não existe."}</p>
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
    </div>
  );
}
