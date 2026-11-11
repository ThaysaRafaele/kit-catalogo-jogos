"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";
import { useAviso } from "./Aviso";
import { estilos } from "./estilos";

type Props = { anoSugerido: number; tituloSugerido: string };

/** Cria a pasta da edição com um edicao.json de modelo. */
export function NovaEdicao({ anoSugerido, tituloSugerido }: Props) {
  const [enviando, setEnviando] = useState(false);
  const { avisar } = useAviso();
  const router = useRouter();

  async function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const ano = String(dados.get("ano"));
    setEnviando(true);
    try {
      const resposta = await fetch("/api/admin/edicoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano, titulo: dados.get("titulo") }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string };
      if (resposta.ok) {
        avisar({
          tipo: "ok",
          texto: `Edição ${ano} criada. Cadastre as turmas em "Dados da edição" antes de incluir os jogos.`,
        });
        router.push(`/admin?ano=${ano}`);
        router.refresh();
      } else {
        avisar({ tipo: "erro", texto: corpo.erro ?? "Não foi possível criar a edição." });
      }
    } catch {
      avisar({ tipo: "erro", texto: "Sem conexão com o servidor. A edição não foi criada." });
    }
    setEnviando(false);
  }

  return (
    <details className="rounded-xl border-2 border-tinta bg-papel-claro p-4">
      <summary className="cursor-pointer font-bold">Criar nova edição</summary>
      <form onSubmit={criar} className="mt-4 flex flex-col gap-4">
        <p className={estilos.ajuda}>
          Os créditos são copiados da edição mais recente. Turmas e textos você preenche depois.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nova-ano" className={estilos.rotulo}>
            Ano
          </label>
          <input
            id="nova-ano"
            name="ano"
            inputMode="numeric"
            pattern="\d{4}"
            required
            defaultValue={anoSugerido}
            className={`${estilos.campo} max-w-40`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nova-titulo" className={estilos.rotulo}>
            Título
          </label>
          <input id="nova-titulo" name="titulo" required defaultValue={tituloSugerido} className={estilos.campo} />
        </div>
        <button type="submit" disabled={enviando} className={`${BASE_BOTAO} ${estiloBotao("primary")} self-start`}>
          {enviando ? "Criando..." : "Criar edição"}
        </button>
      </form>
    </details>
  );
}
