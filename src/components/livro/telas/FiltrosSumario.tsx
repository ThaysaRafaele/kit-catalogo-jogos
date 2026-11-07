"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { PixelButton } from "@/components/PixelButton";
import type { Tema } from "@/lib/esquema";
import { contar } from "@/lib/formato";
import type { Fase } from "@/lib/paginas";
import { TEMAS } from "@/lib/temas";

type Filtros = {
  turma: string | null;
  tema: Tema | null;
  setTurma: (turma: string | null) => void;
  setTema: (tema: Tema | null) => void;
  fases: Fase[];
  visiveis: Fase[];
};

const FiltrosContext = createContext<Filtros | null>(null);

/** Os filtros ficam acima das páginas: valem para as duas e sobrevivem ao folhear. */
export function ProvedorFiltros({ fases, children }: { fases: Fase[]; children: ReactNode }) {
  const [turma, setTurma] = useState<string | null>(null);
  const [tema, setTema] = useState<Tema | null>(null);
  const visiveis = fases.filter((f) => (!turma || f.turma === turma) && (!tema || f.tema === tema));

  return (
    <FiltrosContext.Provider value={{ turma, tema, setTurma, setTema, fases, visiveis }}>
      {children}
    </FiltrosContext.Provider>
  );
}

function useFiltros() {
  const filtros = useContext(FiltrosContext);
  if (!filtros) throw new Error("O sumário precisa estar dentro de ProvedorFiltros.");
  return filtros;
}

type PropsGrupo<T> = {
  nome: string;
  opcoes: { rotulo: string; valor: T | null }[];
  valor: T | null;
  onChange: (valor: T | null) => void;
};

function GrupoFiltro<T>({ nome, opcoes, valor, onChange }: PropsGrupo<T>) {
  return (
    <div role="group" aria-label={`Filtrar por ${nome.toLowerCase()}`} className="flex flex-col gap-2.5">
      <p aria-hidden="true" className="font-pixelify text-lg font-bold">
        {nome}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {opcoes.map((opcao) => (
          <PixelButton
            key={String(opcao.valor ?? "")}
            label={opcao.rotulo}
            variant="chip"
            pressed={valor === opcao.valor}
            onPress={() => onChange(opcao.valor)}
          />
        ))}
      </div>
    </div>
  );
}

const OPCOES_TEMA = [
  { rotulo: "Todos", valor: null },
  ...(Object.keys(TEMAS) as Tema[]).map((tema) => ({ rotulo: TEMAS[tema].nomeCurto, valor: tema })),
];

export function FiltrosFases() {
  const { turma, tema, setTurma, setTema, fases, visiveis } = useFiltros();
  // Só turmas com jogos: as demais nunca dariam resultado.
  const turmas = [...new Set(fases.map((f) => f.turma))];
  const opcoesTurma = [
    { rotulo: "Todas", valor: null },
    ...turmas.map((id) => ({ rotulo: id, valor: id })),
  ];

  return (
    <>
      <GrupoFiltro
        nome="Turma"
        opcoes={opcoesTurma}
        valor={turma}
        onChange={setTurma}
      />
      <GrupoFiltro
        nome="Tema"
        opcoes={OPCOES_TEMA}
        valor={tema}
        onChange={setTema}
      />
      <p aria-live="polite" className="mt-1.5 text-[17px] font-bold">
        {contar(visiveis.length, "fase encontrada", "fases encontradas")}
      </p>
    </>
  );
}

export function MapaDeFases() {
  const { fases, visiveis } = useFiltros();

  if (visiveis.length === 0) {
    return (
      <p className="rounded-[10px] border-[3px] border-dashed border-terra bg-papel-escuro p-3.5 text-[17px]">
        {fases.length === 0
          ? "Esta edição ainda não tem fases."
          : "Nenhuma fase com esse filtro. Tente outra turma ou outro tema."}
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
                Fase {f.fase} • Turma {f.turma} • {TEMAS[f.tema].nome}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
