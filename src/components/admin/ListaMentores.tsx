"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";
import { contar } from "@/lib/formato";
import { useAviso } from "./Aviso";
import { BotaoExcluir } from "./BotaoExcluir";
import { estilos } from "./estilos";

export type ResumoMentor = {
  slug: string;
  nome: string;
  cargo: string;
  lider: boolean;
  /** Caminho público da foto, se ela existe. */
  foto: string | null;
  pendencias: string[];
};

type Props = { mentores: ResumoMentor[]; sha: string };

const botao = (variante: "secondary" | "ghost") => `${BASE_BOTAO} ${estiloBotao(variante)}`;

export function ListaMentores({ mentores, sha }: Props) {
  const [movendo, setMovendo] = useState(false);
  // Depois de mover, a lista (e o sha) da tela só ficam certos quando o servidor
  // manda a versão nova. Até lá, outro Subir/Descer/Excluir usaria dados velhos.
  const [shaVencido, setShaVencido] = useState<string | null>(null);
  const ocupado = movendo || shaVencido === sha;
  const { avisar } = useAviso();
  const router = useRouter();

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (ocupado || destino < 0 || destino >= mentores.length) return;
    const ordem = mentores.map((m) => m.slug);
    [ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]];
    setMovendo(true);
    try {
      const resposta = await fetch("/api/admin/mentores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem, sha }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string };
      if (resposta.ok) {
        // Só anuncia: o foco fica no botão, para a pessoa poder mover de novo.
        avisar({ tipo: "ok", texto: `${mentores[indice].nome} agora está na posição ${destino + 1} de ${mentores.length}.` }, { focar: false });
        setShaVencido(sha);
        router.refresh();
      } else {
        avisar({ tipo: "erro", texto: corpo.erro ?? "Não foi possível mudar a ordem." });
      }
    } catch {
      avisar({ tipo: "erro", texto: "Sem conexão com o servidor. A ordem não mudou." });
    }
    setMovendo(false);
  }

  return (
    <ol className="flex flex-col gap-4">
      {mentores.map((mentor, i) => {
        const primeiro = i === 0;
        const ultimo = i === mentores.length - 1;
        return (
          <li key={mentor.slug} className="flex flex-wrap gap-4 rounded-xl border-2 border-tinta bg-papel-claro p-4">
            {mentor.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto do próprio catálogo, já em WebP
              <img src={mentor.foto} alt="" className="size-20 rounded-full border-2 border-tinta object-cover" />
            ) : (
              <div aria-hidden="true" className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-tracejado text-suave">
                sem foto
              </div>
            )}
            <div className="flex min-w-60 flex-1 flex-col gap-2">
              <h2 className="text-xl font-bold text-tinta">{mentor.nome}</h2>
              <p className={estilos.ajuda}>
                {mentor.cargo === "coordenação" ? "Coordenação" : mentor.cargo === "professor" ? "Professor ou professora" : "Cargo não escolhido"}
                {mentor.lider && " • Líder (aparece em destaque)"}
              </p>
              {mentor.pendencias.length > 0 && (
                <details>
                  <summary className="cursor-pointer">{contar(mentor.pendencias.length, "pendência", "pendências")}</summary>
                  <ul className="mt-1 list-disc pl-6">
                    {mentor.pendencias.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex flex-wrap gap-3">
                <a href={`/admin/mentores/${mentor.slug}`} className={botao("secondary")} aria-label={`Editar ${mentor.nome}`}>
                  Editar
                </a>
                {/* aria-disabled nas pontas (e não disabled): o foco não se perde depois de mover. */}
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  aria-disabled={primeiro || ocupado || undefined}
                  aria-label={`Subir ${mentor.nome}`}
                  className={`${botao("ghost")} aria-disabled:opacity-40`}
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  aria-disabled={ultimo || ocupado || undefined}
                  aria-label={`Descer ${mentor.nome}`}
                  className={`${botao("ghost")} aria-disabled:opacity-40`}
                >
                  Descer
                </button>
                <BotaoExcluir
                  nome={mentor.nome}
                  url={`/api/admin/mentores/${mentor.slug}`}
                  corpo={{ sha }}
                  explicacao="A ficha e a foto saem da página de mentores do catálogo."
                  ocupado={ocupado}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
