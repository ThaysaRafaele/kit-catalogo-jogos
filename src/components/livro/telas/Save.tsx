import type { ReactElement } from "react";
import { doisDigitos, type ContextoLivro, type SlotSave } from "@/lib/paginas";
import { Cabecalho } from "./Cabecalho";

export function SaveEsquerda() {
  return (
    <div className="flex flex-col gap-5">
      <Cabecalho rotulo="Arquivo do catálogo" className="text-[30px]">
        Select <br />
        save file
      </Cabecalho>
      <p className="text-lg leading-[1.6]">
        Cada ano da Mostra vira um arquivo salvo. Escolha a edição que você quer jogar, quer dizer,
        ler.
      </p>
      <svg
        width="160"
        height="160"
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        aria-hidden="true"
        className="mt-6 self-center"
      >
        <path className="fill-madeira" d="M1 1h12l2 2v12h-14z" />
        <path fill="#0b2d8f" d="M2 2h10l2 2v10h-12z" />
        <path className="fill-papel" d="M4 2h7v4h-7z" />
        <path className="fill-madeira" d="M8 3h2v2h-2z" />
        <path className="fill-papel" d="M3 9h10v5h-10z" />
        <path className="fill-laranja" d="M4 10h8v1h-8zM4 12h6v1h-6z" />
      </svg>
      <p className="text-[17px] leading-[1.6]">
        Uma nova edição chega a cada ano. Os slots vazios esperam as próximas turmas.
      </p>
    </div>
  );
}

function ConteudoSlot({ save, numero }: { save: SlotSave; numero: number }) {
  const vazio = save.estado === "vazio";
  return (
    <>
      <span
        aria-hidden="true"
        className={`flex size-[68px] flex-none items-center justify-center rounded-[10px] border-4 font-press text-sm ${
          vazio ? "border-dashed border-terra" : "border-tinta bg-laranja text-tinta"
        }`}
      >
        {doisDigitos(numero)}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className={`font-press text-lg ${vazio ? "" : "text-vinho"}`}>{save.ano}</span>
        <span className="text-lg font-extrabold">{save.titulo}</span>
        <span className="text-base">{save.info}</span>
      </span>
    </>
  );
}

const BASE_SLOT = "flex items-center gap-4 rounded-[14px] border-4 p-[18px]";
const CARTAO = `${BASE_SLOT} border-tinta bg-papel-claro text-left text-texto shadow-bloco`;

type PropsSlot = { save: SlotSave; numero: number; onAtual?: () => void };

function Slot({ save, numero, onAtual }: PropsSlot): ReactElement {
  switch (save.estado) {
    case "atual":
      return (
        <button type="button" onClick={onAtual} className={`${CARTAO} cursor-pointer`}>
          <ConteudoSlot save={save} numero={numero} />
        </button>
      );
    case "outra":
      return (
        <a href={`/${save.ano}`} className={CARTAO}>
          <ConteudoSlot save={save} numero={numero} />
        </a>
      );
    case "vazio":
      return (
        <div className={`${BASE_SLOT} border-dashed border-terra bg-papel-escuro text-madeira`}>
          <ConteudoSlot save={save} numero={numero} />
        </div>
      );
  }
}

export function SaveDireita({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="flex flex-col gap-[22px] pt-3">
      {ctx.saves.map((save, i) => (
        <Slot key={save.ano} save={save} numero={i + 1} onAtual={ctx.goIntro} />
      ))}
    </div>
  );
}
