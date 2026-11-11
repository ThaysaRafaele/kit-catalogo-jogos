"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { estilos } from "./estilos";

type Props = {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  /** Texto de apoio, lido junto com o campo. */
  ajuda?: ReactNode;
  erro?: string;
  /** Caixa de várias linhas (sinopse, quem é...). */
  linhas?: number;
  /** Atributos extras do input (inputMode, autoComplete...). */
  extra?: InputHTMLAttributes<HTMLInputElement>;
  /** Conteúdo ao lado do campo, como o botão "Sugerir descrição". */
  acao?: ReactNode;
};

/**
 * Campo com rótulo visível. A ajuda e o erro ficam ligados ao campo pelo
 * aria-describedby, e o erro marca o campo com aria-invalid.
 */
export function Campo({ id, rotulo, valor, aoMudar, ajuda, erro, linhas, extra, acao }: Props) {
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const descrito = [idErro, idAjuda].filter(Boolean).join(" ") || undefined;
  const comum = {
    id,
    value: valor,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": descrito,
    className: estilos.campo,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={estilos.rotulo}>
        {rotulo}
      </label>
      {ajuda && (
        <p id={idAjuda} className={estilos.ajuda}>
          {ajuda}
        </p>
      )}
      {linhas ? (
        <textarea {...comum} rows={linhas} onChange={(e) => aoMudar(e.target.value)} />
      ) : (
        <input {...comum} {...extra} onChange={(e) => aoMudar(e.target.value)} />
      )}
      {erro && (
        <p id={idErro} className={estilos.erroCampo}>
          {erro}
        </p>
      )}
      {acao}
    </div>
  );
}
