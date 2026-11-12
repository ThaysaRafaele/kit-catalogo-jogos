import type { Metadata } from "next";
import { ProvedorAviso } from "@/components/admin/Aviso";
import { ListaMentores, type ResumoMentor } from "@/components/admin/ListaMentores";
import { ErroTela, TelaJogo } from "@/components/admin/TelaJogo";
import { fotoDoMentor, paraFormularioMentor, slugDoMentor } from "@/lib/admin/formularioMentor";
import { caminhos, paraSrc } from "@/lib/admin/caminhos";
import { lerMentores } from "@/lib/admin/dados";
import { listarArquivos } from "@/lib/admin/repositorio";
import { classeBotao } from "@/lib/botoes";

export const metadata: Metadata = { title: "Mentores" };

export default async function Mentores() {
  const [{ fichas, sha, erro }, fotos] = await Promise.all([lerMentores(), listarArquivos(caminhos.pastaFotos())]);
  const fotosExistentes = new Set(fotos.map(paraSrc));

  const mentores: ResumoMentor[] = fichas.map((ficha) => {
    const m = paraFormularioMentor(ficha);
    const foto = fotoDoMentor(m.nome);
    const pendencias = [
      !fotosExistentes.has(foto) && "Foto não enviada",
      !m.cargo && "Cargo",
      !m.classe && "Classe",
      !m.skills.some((s) => s.trim()) && "Formação (nenhum item)",
      !m.specialAbility && "Habilidade especial",
      !m.funFact && "Curiosidade",
    ].filter((p): p is string => Boolean(p));
    return {
      slug: slugDoMentor(m.nome),
      nome: m.nome,
      cargo: m.cargo,
      lider: m.lider,
      foto: fotosExistentes.has(foto) ? foto : null,
      pendencias,
    };
  });

  return (
    <ProvedorAviso>
      <TelaJogo titulo="Mentores" voltar={{ href: "/admin", texto: "Voltar ao painel" }}>
        <p>
          A ordem da lista é a ordem das fichas no catálogo. Quem está marcado como líder aparece em destaque na
          primeira página.
        </p>
        {erro || !sha ? (
          <ErroTela>
            <p className="font-bold">{erro}</p>
          </ErroTela>
        ) : (
          <>
            <a href="/admin/mentores/novo" className={`${classeBotao("primary")} self-start`}>
              Novo mentor
            </a>
            <ListaMentores mentores={mentores} sha={sha} />
          </>
        )}
      </TelaJogo>
    </ProvedorAviso>
  );
}
