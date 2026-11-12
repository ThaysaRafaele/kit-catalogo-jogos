import type { ReactNode } from "react";
import { estilos } from "./estilos";

type Props = {
  titulo: string;
  children: ReactNode;
  /** Link de volta: por padrão, o painel da edição `ano`. */
  voltar?: { href: string; texto: string };
  ano?: string;
};

/** Moldura das telas do admin: link de volta e título. */
export function TelaJogo({ titulo, children, ano, voltar }: Props) {
  const destino = voltar ?? { href: `/admin?ano=${ano}`, texto: `Voltar ao painel da edição ${ano}` };
  return (
    <div className="flex flex-col gap-6">
      <p>
        <a href={destino.href}>← {destino.texto}</a>
      </p>
      <h1 className={estilos.titulo}>{titulo}</h1>
      {children}
    </div>
  );
}

export function ErroTela({ children }: { children: ReactNode }) {
  return <div className={estilos.caixaErro}>{children}</div>;
}
