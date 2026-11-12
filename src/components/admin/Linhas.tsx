"use client";

import { useEffect, useState, type ReactNode } from "react";
import { classeBotao } from "@/lib/botoes";
import { estilos } from "./estilos";

type Props<T> = {
  itens: T[];
  aoMudar: (itens: T[]) => void;
  novo: () => T;
  /** Nome de cada linha na legenda: "Turma" vira "Turma 1", "Turma 2"... */
  nomeDaLinha: string;
  /** Texto que identifica a linha no botão de remover ("Remover linha 2: 2º G"). */
  descrever: (item: T) => string;
  /** Id do primeiro campo da linha: recebe o foco quando a linha é criada. */
  idPrimeiroCampo: (indice: number) => string;
  idAdicionar: string;
  rotuloAdicionar: string;
  vazio: string;
  /** Mensagem para a área de status (aria-live) do formulário. */
  anunciar: (texto: string) => void;
  children: (item: T, indice: number) => ReactNode;
};

/**
 * Lista de linhas editáveis. Cada linha é um fieldset com legenda própria. Ao
 * adicionar, o foco vai para a linha nova; ao remover, volta ao botão de adicionar.
 */
export function Linhas<T>(props: Props<T>) {
  const { itens, aoMudar, novo, nomeDaLinha, descrever, idPrimeiroCampo, idAdicionar, anunciar } = props;
  const [focar, setFocar] = useState<string | null>(null);

  useEffect(() => {
    if (!focar) return;
    document.getElementById(focar)?.focus();
    setFocar(null);
  }, [focar]);

  return (
    <>
      {itens.length === 0 && <p className={estilos.ajuda}>{props.vazio}</p>}
      {itens.map((item, i) => {
        const descricao = descrever(item).trim();
        return (
          <fieldset key={i} className="flex flex-col gap-3 rounded-xl border-2 border-contorno p-4">
            <legend className="px-1 font-bold">
              {nomeDaLinha} {i + 1}
            </legend>
            {props.children(item, i)}
            <button
              type="button"
              onClick={() => {
                aoMudar(itens.filter((_, j) => j !== i));
                setFocar(idAdicionar);
                anunciar(`Linha ${i + 1} removida.`);
              }}
              className={`${classeBotao("ghost")} self-start`}
            >
              Remover linha {i + 1}
              {descricao && `: ${descricao}`}
            </button>
          </fieldset>
        );
      })}
      <button
        type="button"
        id={idAdicionar}
        onClick={() => {
          aoMudar([...itens, novo()]);
          setFocar(idPrimeiroCampo(itens.length));
          anunciar(`Linha ${itens.length + 1} adicionada.`);
        }}
        className={`${classeBotao("secondary")} self-start`}
      >
        {props.rotuloAdicionar}
      </button>
    </>
  );
}
