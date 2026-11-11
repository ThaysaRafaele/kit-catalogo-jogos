"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { PixelButton } from "@/components/PixelButton";
import type { Tema } from "@/lib/esquema";
import { contar } from "@/lib/formato";
import type { Fase } from "@/lib/paginas";
import { TEMAS } from "@/lib/temas";
import { ListaFases } from "./ListaFases";

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
      <p aria-hidden="true" className="titulo-bloco text-suave">
        {nome}
      </p>
      <div className="flex flex-wrap gap-2">
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
      <p aria-live="polite" className="mt-1 text-[17px] text-suave">
        {contar(visiveis.length, "fase encontrada", "fases encontradas")}
      </p>
    </>
  );
}

export function MapaDeFases() {
  const { fases, visiveis } = useFiltros();

  if (visiveis.length === 0) {
    return (
      <p className="text-lg text-suave">
        {fases.length === 0
          ? "Esta edição ainda não tem fases."
          : "Nenhuma fase com esse filtro. Tente outra turma ou outro tema."}
      </p>
    );
  }

  return (
    <ListaFases
      itens={visiveis.map((f) => ({
        ...f,
        detalhe: `Fase ${f.fase} • Turma ${f.turma} • ${TEMAS[f.tema].nome}`,
      }))}
    />
  );
}
