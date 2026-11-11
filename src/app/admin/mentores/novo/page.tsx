import type { Metadata } from "next";
import { FormMentor } from "@/components/admin/FormMentor";
import { estilos } from "@/components/admin/estilos";
import { ErroTela } from "@/components/admin/TelaJogo";
import { mentorVazio, paraFormularioMentor, slugDoMentor } from "@/lib/admin/formularioMentor";
import { lerMentores } from "@/lib/admin/publicarMentor";

export const metadata: Metadata = { title: "Novo mentor" };

export default async function NovoMentor() {
  const { fichas, sha, erro } = await lerMentores();
  return (
    <div className="flex flex-col gap-6">
      <p>
        <a href="/admin/mentores">← Voltar à lista de mentores</a>
      </p>
      <h1 className={estilos.titulo}>Novo mentor</h1>
      {erro || !sha ? (
        <ErroTela>
          <p className="font-bold">{erro ?? "O arquivo content/mentores.json não existe."}</p>
        </ErroTela>
      ) : (
        <FormMentor
          inicial={mentorVazio()}
          sha={sha}
          slugOriginal={null}
          outrosSlugs={fichas.map((f) => slugDoMentor(paraFormularioMentor(f).nome))}
          temFoto={false}
        />
      )}
    </div>
  );
}
