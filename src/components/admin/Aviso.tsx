"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { estilos } from "./estilos";

type Aviso = { tipo: "ok" | "erro"; texto: ReactNode };
type ContextoAviso = { avisar: (aviso: Aviso | null) => void };

const Contexto = createContext<ContextoAviso>({ avisar: () => {} });

export const useAviso = () => useContext(Contexto);

/**
 * Área de avisos do topo da página (aria-live). Fica fora das listas: quando um
 * jogo some depois de excluído, a mensagem continua aqui, e o foco vem para ela.
 */
export function ProvedorAviso({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  const avisar = useCallback((novo: Aviso | null) => {
    setAviso(novo);
    if (novo) requestAnimationFrame(() => caixa.current?.focus());
  }, []);

  return (
    <Contexto.Provider value={{ avisar }}>
      <div
        ref={caixa}
        tabIndex={-1}
        aria-live="polite"
        className={aviso ? `${aviso.tipo === "ok" ? estilos.caixaOk : estilos.caixaErro} mb-6` : "sr-only"}
      >
        {aviso?.texto}
      </div>
      {children}
    </Contexto.Provider>
  );
}
