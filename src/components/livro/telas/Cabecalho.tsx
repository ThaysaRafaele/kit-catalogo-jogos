import type { ReactNode } from "react";

type Props = {
  rotulo: string;
  /** Tamanho e altura de linha do título, que variam conforme a tela. */
  className: string;
  children: ReactNode;
};

/** Rótulo pequeno seguido do título (h2) da página. */
export function Cabecalho({ rotulo, className, children }: Props) {
  return (
    <>
      <p className="font-pixelify text-base font-semibold text-vinho uppercase">{rotulo}</p>
      <h2 className={`font-press text-vinho uppercase ${className}`}>{children}</h2>
    </>
  );
}
