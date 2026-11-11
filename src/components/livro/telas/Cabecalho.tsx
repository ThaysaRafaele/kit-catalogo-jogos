import type { ReactNode } from "react";

/** Rótulo pequeno com o quadradinho laranja, acima do título da página. */
export function Marcador({ children }: { children: ReactNode }) {
  return (
    <p className="titulo-bloco flex items-center gap-2.5 wrap-anywhere">
      <span aria-hidden="true" className="size-2 flex-none bg-laranja" />
      {children}
    </p>
  );
}

type Props = {
  rotulo: string;
  /** Tamanho e altura de linha do título, quando diferem do padrão. */
  className?: string;
  children: ReactNode;
};

/** Marcador seguido do título (h2) da página. */
export function Cabecalho({ rotulo, className = "text-2xl/[1.6]", children }: Props) {
  return (
    <>
      <Marcador>{rotulo}</Marcador>
      <h2 className={`font-press text-vinho uppercase ${className}`}>{children}</h2>
    </>
  );
}
