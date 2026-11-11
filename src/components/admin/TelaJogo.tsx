import type { ReactNode } from "react";
import { estilos } from "./estilos";

type Props = { ano: string; titulo: string; children: ReactNode };

/** Moldura das telas do formulário do jogo: título e link de volta ao painel. */
export function TelaJogo({ ano, titulo, children }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p>
        <a href={`/admin?ano=${ano}`}>← Voltar ao painel da edição {ano}</a>
      </p>
      <h1 className={estilos.titulo}>{titulo}</h1>
      {children}
    </div>
  );
}

export function ErroTela({ children }: { children: ReactNode }) {
  return <div className={estilos.caixaErro}>{children}</div>;
}
