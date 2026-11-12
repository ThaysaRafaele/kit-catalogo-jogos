import type { Metadata } from "next";
import { FormMentor } from "@/components/admin/FormMentor";
import { ErroTela, TelaJogo } from "@/components/admin/TelaJogo";
import { mentorVazio, paraFormularioMentor, slugDoMentor } from "@/lib/admin/formularioMentor";
import { lerMentores } from "@/lib/admin/dados";

export const metadata: Metadata = { title: "Novo mentor" };

export default async function NovoMentor() {
  const { fichas, sha, erro } = await lerMentores();
  return (
    <TelaJogo titulo="Novo mentor" voltar={{ href: "/admin/mentores", texto: "Voltar à lista de mentores" }}>
      {erro || !sha ? (
        <ErroTela>
          <p className="font-bold">{erro}</p>
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
    </TelaJogo>
  );
}
