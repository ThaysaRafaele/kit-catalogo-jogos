import type { ReactElement } from "react";
import { LOGO_CURSO, LOGO_ESCOLA } from "@/lib/marca";
import { doisDigitos } from "@/lib/formato";
import type { ContextoLivro, PaginaLivro } from "@/lib/paginas";
import { AberturaDireita, AberturaEsquerda } from "./telas/Abertura";
import { CapaDireita, CapaEsquerda } from "./telas/Capa";
import { SaveDireita, SaveEsquerda } from "./telas/Save";
import { SumarioDireita, SumarioEsquerda } from "./telas/Sumario";

type Props = { s: PaginaLivro; side: "L" | "R"; ctx: ContextoLivro };

/** Rodapé decorativo: o número da página também é anunciado pelo livro. */
function Rodape({ numero, direita }: { numero: number; direita: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute right-6 bottom-5 left-6 flex items-center gap-2 ${direita ? "flex-row-reverse" : ""}`}
    >
      <img src={LOGO_ESCOLA.rodape} alt="" className="block size-6 object-contain" />
      <img src={LOGO_CURSO.rodape} alt="" className="block size-6 object-contain" />
      <span className="font-press text-xs text-[#5a3a2c]">{doisDigitos(numero)}</span>
    </div>
  );
}

// O tipo de retorno faz o TypeScript acusar uma tela nova que ficou sem "case".
function Conteudo({ s, side, ctx }: Props): ReactElement {
  switch (s.kind) {
    case "cover":
      return side === "L" ? <CapaEsquerda ctx={ctx} /> : <CapaDireita ctx={ctx} />;
    case "save":
      return side === "L" ? <SaveEsquerda /> : <SaveDireita ctx={ctx} />;
    case "intro":
      return side === "L" ? <AberturaEsquerda ctx={ctx} /> : <AberturaDireita ctx={ctx} />;
    case "toc":
      return side === "L" ? <SumarioEsquerda /> : <SumarioDireita />;
  }
}

export function BookPage({ s, side, ctx }: Props) {
  const direita = side === "R";
  return (
    <div className="page relative h-full bg-papel">
      <Conteudo s={s} side={side} ctx={ctx} />
      <Rodape numero={s.idx * 2 + (direita ? 2 : 1)} direita={direita} />
    </div>
  );
}
