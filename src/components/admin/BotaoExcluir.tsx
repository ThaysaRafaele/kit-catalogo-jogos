"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";
import { useAviso } from "./Aviso";
import { estilos } from "./estilos";

type Props = {
  /** O que vai ser excluído, como aparece na tela ("Heaven Runner", "Robin Bryan"). */
  nome: string;
  /** Rota DELETE da API. */
  url: string;
  /** Corpo do pedido, em geral { sha } para o servidor recusar se alguém salvou depois. */
  corpo: object;
  /** O que sai do catálogo, para a pessoa confirmar sabendo. */
  explicacao: string;
  /** Outra gravação em andamento (ex.: a lista sendo reordenada): o botão espera. */
  ocupado?: boolean;
};

/** Botão "Excluir" com confirmação num <dialog> nativo (prende o foco e fecha no Esc). */
export function BotaoExcluir({ nome, url, corpo, explicacao, ocupado = false }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [excluindo, setExcluindo] = useState(false);
  const { avisar } = useAviso();
  const router = useRouter();
  const titulo = useId();

  async function excluir() {
    setExcluindo(true);
    try {
      const resposta = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const resultado = (await resposta.json().catch(() => ({}))) as { erro?: string };
      dialogo.current?.close();
      if (resposta.ok) {
        avisar({ tipo: "ok", texto: `Exclusão de ${nome} feita. O catálogo atualiza em cerca de 2 minutos.` });
        router.refresh();
      } else {
        avisar({ tipo: "erro", texto: resultado.erro ?? "Não foi possível excluir." });
      }
    } catch {
      dialogo.current?.close();
      avisar({ tipo: "erro", texto: "Sem conexão com o servidor. Nada foi excluído." });
    }
    setExcluindo(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!ocupado) dialogo.current?.showModal();
        }}
        aria-disabled={ocupado || undefined}
        className={`${BASE_BOTAO} ${estiloBotao("ghost")} aria-disabled:opacity-40`}
        aria-label={`Excluir ${nome}`}
      >
        Excluir
      </button>
      <dialog ref={dialogo} aria-labelledby={titulo} className={`${estilos.cartao} m-auto max-w-md backdrop:bg-tinta/60`}>
        <h2 id={titulo} className={estilos.subtitulo}>
          Excluir {nome}?
        </h2>
        <p className="mt-3">{explicacao} Dá para recuperar pelo histórico do GitHub, mas não por aqui.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => dialogo.current?.close()}
            disabled={excluindo}
            className={`${BASE_BOTAO} ${estiloBotao("secondary")}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            className={`${BASE_BOTAO} ${estiloBotao("primary")}`}
          >
            {excluindo ? "Excluindo..." : "Excluir de vez"}
          </button>
        </div>
      </dialog>
    </>
  );
}
