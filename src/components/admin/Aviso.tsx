"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { estilos } from "./estilos";

type Aviso = { tipo: "ok" | "erro"; texto: ReactNode };
/**
 * `focar: false` só anuncia (aria-live), sem tirar o foco de onde está. Ex.: depois
 * de "Subir", o foco continua no botão para a pessoa poder subir de novo.
 */
type ContextoAviso = { avisar: (aviso: Aviso | null, opcoes?: { focar?: boolean }) => void };

const Contexto = createContext<ContextoAviso>({ avisar: () => {} });

export const useAviso = () => useContext(Contexto);

/**
 * Área de avisos do topo da página (aria-live). Fica fora das listas: quando um
 * jogo some depois de excluído, a mensagem continua aqui, e o foco vem para ela.
 */
export function ProvedorAviso({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  const avisar = useCallback((novo: Aviso | null, { focar = true } = {}) => {
    setAviso(novo);
    if (novo && focar) requestAnimationFrame(() => caixa.current?.focus());
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
