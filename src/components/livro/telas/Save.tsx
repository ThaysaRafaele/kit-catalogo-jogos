import type { ReactElement } from "react";
import { doisDigitos } from "@/lib/formato";
import type { ContextoLivro, Destino, SlotSave } from "@/lib/paginas";
import { Cabecalho } from "./Cabecalho";

export function SaveEsquerda() {
  return (
    <div className="flex flex-col gap-[22px]">
      <Cabecalho rotulo="Arquivo do catálogo">
        Select <br />
        save file
      </Cabecalho>
      <p className="max-w-[30ch] text-[19px] leading-[1.7]">
        Cada ano da Mostra vira um arquivo salvo. Uma nova edição chega a cada ano, e os slots vazios
        esperam as próximas turmas.
      </p>
      <svg
        width="128"
        height="128"
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        aria-hidden="true"
        className="mt-10"
      >
        <path className="fill-tinta" d="M1 1h12l2 2v12h-14z" />
        <path fill="#2b4a9a" d="M2 2h10l2 2v10h-12z" />
        <path className="fill-papel" d="M4 2h7v4h-7z" />
        <path className="fill-tinta" d="M8 3h2v2h-2z" />
        <path className="fill-papel" d="M3 9h10v5h-10z" />
        <path className="fill-laranja" d="M4 10h8v1h-8zM4 12h6v1h-6z" />
      </svg>
    </div>
  );
}

function ConteudoSlot({ save, numero }: { save: SlotSave; numero: number }) {
  const vazio = save.estado === "vazio";
  return (
    <>
      <span
        aria-hidden="true"
        className={`flex size-14 flex-none items-center justify-center rounded-lg border-2 font-press text-[13px] ${
          vazio ? "border-dashed border-contorno" : "border-tinta bg-laranja text-tinta"
        }`}
      >
        {doisDigitos(numero)}
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className={`font-press text-[15px] ${vazio ? "" : "text-vinho"}`}>{save.ano}</span>
        <span className="text-lg font-extrabold">{save.titulo}</span>
        <span className="text-base text-suave">{save.info}</span>
      </span>
      {!vazio && (
        <span aria-hidden="true" className="font-press text-sm text-brasa">
          ▶
        </span>
      )}
    </>
  );
}

const BASE_SLOT = "flex w-full items-center gap-[18px] rounded-xl border-2 p-5";
const CARTAO = `${BASE_SLOT} border-tinta bg-papel-claro text-left text-texto shadow-bloco-baixo`;

function Slot({ save, numero }: { save: SlotSave; numero: number }): ReactElement {
  switch (save.estado) {
    case "atual":
      return (
        <button
          type="button"
          aria-current="true"
          data-ir={"intro" satisfies Destino}
          className={`${CARTAO} cursor-pointer`}
        >
          <ConteudoSlot save={save} numero={numero} />
        </button>
      );
    case "outra":
      return (
        <a href={`/${save.ano}`} className={`${CARTAO} no-underline hover:text-texto`}>
          <ConteudoSlot save={save} numero={numero} />
        </a>
      );
    case "vazio":
      return (
        <div className={`${BASE_SLOT} border-dashed border-contorno text-suave`}>
          <ConteudoSlot save={save} numero={numero} />
        </div>
      );
  }
}

export function SaveDireita({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="flex flex-col gap-4 pt-6">
      {ctx.saves.map((save, i) => (
        <Slot key={save.ano} save={save} numero={i + 1} />
      ))}
    </div>
  );
}
