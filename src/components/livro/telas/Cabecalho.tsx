import type { ReactNode } from "react";

type Props = {
  rotulo: string;
  /** Tamanho do título, que varia conforme a tela. */
  className: string;
  children: ReactNode;
};

/** Rótulo pequeno seguido do título (h2) da página. */
export function Cabecalho({ rotulo, className, children }: Props) {
  return (
    <>
      <p className="font-pixelify text-base font-semibold text-vinho uppercase">{rotulo}</p>
      <h2 className={`font-press leading-[1.4] text-vinho uppercase ${className}`}>{children}</h2>
    </>
  );
}
