import type { ReactNode } from "react";
import { estilos } from "./estilos";

/** Bloco do formulário (Protagonista, Turmas...): um fieldset com a legenda como título. */
export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className={`${estilos.cartao} flex flex-col gap-5`}>
      <legend className="float-left mb-1 w-full font-press text-base leading-snug text-vinho">{titulo}</legend>
      {children}
    </fieldset>
  );
}
