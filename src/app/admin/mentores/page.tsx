import type { Metadata } from "next";
import { ProvedorAviso } from "@/components/admin/Aviso";
import { estilos } from "@/components/admin/estilos";
import { ListaMentores, type ResumoMentor } from "@/components/admin/ListaMentores";
import { ErroTela } from "@/components/admin/TelaJogo";
import { fotoDoMentor, paraFormularioMentor, slugDoMentor } from "@/lib/admin/formularioMentor";
import { lerMentores } from "@/lib/admin/publicarMentor";
import { listarArquivos } from "@/lib/admin/repositorio";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";

export const metadata: Metadata = { title: "Mentores" };

export default async function Mentores() {
  const [{ fichas, sha, erro }, fotos] = await Promise.all([lerMentores(), listarArquivos("public/mentores")]);
  const fotosExistentes = new Set(fotos.map((caminho) => caminho.replace(/^public/, "")));

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
      <div className="flex flex-col gap-6">
        <p>
          <a href="/admin">← Voltar ao painel</a>
        </p>
        <h1 className={estilos.titulo}>Mentores</h1>
        <p>
          A ordem da lista é a ordem das fichas no catálogo. Quem está marcado como líder aparece em destaque na
          primeira página.
        </p>
        {erro || !sha ? (
          <ErroTela>
            <p className="font-bold">{erro ?? "O arquivo content/mentores.json não existe."}</p>
          </ErroTela>
        ) : (
          <>
            <a href="/admin/mentores/novo" className={`${BASE_BOTAO} ${estiloBotao("primary")} self-start`}>
              Novo mentor
            </a>
            <ListaMentores mentores={mentores} sha={sha} />
          </>
        )}
      </div>
    </ProvedorAviso>
  );
}
