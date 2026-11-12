"use client";

import type { Ref } from "react";
import type { ErroCampo } from "@/lib/admin/formulario";
import { contar } from "@/lib/formato";
import { estilos } from "./estilos";

type Props = { erros: ErroCampo[]; ref?: Ref<HTMLDivElement> };

/** Erros do navegador e do servidor juntos, um por campo. */
export function juntarErros(...listas: ErroCampo[][]): ErroCampo[] {
  const vistos = new Set<string>();
  return listas.flat().filter((erro) => !vistos.has(erro.id) && vistos.add(erro.id));
}

/**
 * Resumo dos erros no topo do formulário. Recebe o foco ao tentar publicar; cada
 * link leva ao campo com erro.
 */
export function ResumoErros({ erros, ref }: Props) {
  if (erros.length === 0) return null;
  return (
    <div ref={ref} tabIndex={-1} className={estilos.caixaErro}>
      <h2 className="font-bold">Corrija {contar(erros.length, "campo", "campos")} antes de publicar:</h2>
      <ul className="mt-2 list-disc pl-6">
        {erros.map((erro) => (
          <li key={erro.id}>
            <a
              href={`#${erro.id}`}
              onClick={(evento) => {
                evento.preventDefault();
                const alvo = document.getElementById(erro.id);
                alvo?.focus();
                alvo?.scrollIntoView({ block: "center" });
              }}
            >
              {erro.rotulo}: {erro.mensagem}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
