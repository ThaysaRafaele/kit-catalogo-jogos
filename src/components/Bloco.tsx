import type { ReactNode } from "react";

type Props = {
  titulo: string;
  /**
   * Dentro de um card (o do mentor): título como rótulo de campo, menos espaço. Fora dele,
   * nas páginas, o título é um h3 de bloco.
   */
  compacto?: boolean;
  /** Classes extras do contêiner, como uma margem acima. */
  className?: string;
  children: ReactNode;
};

/** Bloco com linha fina em cima, título pequeno em ferrugem e o conteúdo. */
export function Bloco({ titulo, compacto = false, className = "", children }: Props) {
  return (
    <div className={`divisoria flex flex-col ${compacto ? "gap-2 py-3" : "gap-2.5 pt-[18px]"} ${className}`}>
      {compacto ? <p className="rotulo">{titulo}</p> : <h3 className="titulo-bloco">{titulo}</h3>}
      {children}
    </div>
  );
}
