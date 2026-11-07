"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { PixelButton } from "@/components/PixelButton";
import type { Tema } from "@/lib/esquema";
import type { Fase } from "@/lib/paginas";

type Filtros = {
  turma: string | null;
  tema: Tema | null;
  setTurma: (turma: string | null) => void;
  setTema: (tema: Tema | null) => void;
};

const FiltrosContext = createContext<Filtros | null>(null);

/** Os filtros ficam acima das páginas: valem para as duas e sobrevivem ao folhear. */
export function ProvedorFiltros({ children }: { children: ReactNode }) {
  const [turma, setTurma] = useState<string | null>(null);
  const [tema, setTema] = useState<Tema | null>(null);
  return (
    <FiltrosContext.Provider value={{ turma, tema, setTurma, setTema }}>
      {children}
    </FiltrosContext.Provider>
  );
}

function useFiltros() {
  const filtros = useContext(FiltrosContext);
  if (!filtros) throw new Error("O sumário precisa estar dentro de ProvedorFiltros.");
  return filtros;
}

function useFasesFiltradas(fases: Fase[]) {
  const { turma, tema } = useFiltros();
  return fases.filter((f) => (!turma || f.turma === turma) && (!tema || f.tema === tema));
}

const OPCOES_TEMA: { rotulo: string; tema: Tema | null }[] = [
  { rotulo: "Todos", tema: null },
  { rotulo: "Folclore", tema: "folclore" },
  { rotulo: "Ficção", tema: "scifi" },
];

function GrupoFiltro({ nome, rotulo, children }: { nome: string; rotulo: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-col gap-2.5">
      <p aria-hidden="true" className="font-pixelify text-lg font-bold">
        {nome}
      </p>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export function FiltrosFases({ turmas, fases }: { turmas: string[]; fases: Fase[] }) {
  const { turma, tema, setTurma, setTema } = useFiltros();
  const total = useFasesFiltradas(fases).length;

  return (
    <>
      <GrupoFiltro nome="Turma" rotulo="Filtrar por turma">
        <PixelButton label="Todas" variant="chip" pressed={turma === null} onPress={() => setTurma(null)} />
        {turmas.map((id) => (
          <PixelButton key={id} label={id} variant="chip" pressed={turma === id} onPress={() => setTurma(id)} />
        ))}
      </GrupoFiltro>
      <GrupoFiltro nome="Tema" rotulo="Filtrar por tema">
        {OPCOES_TEMA.map((opcao) => (
          <PixelButton
            key={opcao.rotulo}
            label={opcao.rotulo}
            variant="chip"
            pressed={tema === opcao.tema}
            onPress={() => setTema(opcao.tema)}
          />
        ))}
      </GrupoFiltro>
      <p aria-live="polite" className="mt-1.5 text-[17px] font-bold">
        {total === 1 ? "1 fase encontrada" : `${total} fases encontradas`}
      </p>
    </>
  );
}

export function MapaDeFases({ fases }: { fases: Fase[] }) {
  const visiveis = useFasesFiltradas(fases);

  if (visiveis.length === 0) {
    return (
      <p className="rounded-[10px] border-[3px] border-dashed border-terra bg-papel-escuro p-3.5 text-[17px]">
        Nenhuma fase com esse filtro. Tente outra turma ou outro tema.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3.5">
      {visiveis.map((f) => (
        <li key={f.slug}>
          <a
            href={`#${f.slug}`}
            className="flex items-center gap-3.5 rounded-[14px] border-4 border-tinta bg-papel-claro p-3.5 text-texto shadow-[0_5px_0_var(--color-tinta)]"
          >
            <span
              aria-hidden="true"
              className="flex size-16 flex-none items-center justify-center rounded-full border-4 border-tinta bg-grama font-press text-xs text-[#12300a]"
            >
              {f.fase}
            </span>
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="text-lg font-extrabold">{f.nome}</span>
              <span className="text-base">
                Fase {f.fase} • Turma {f.turma} • {f.temaNome}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
