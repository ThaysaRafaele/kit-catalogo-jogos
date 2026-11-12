"use client";

import { useRef, useState, type FormEvent } from "react";
import { pedir } from "@/lib/admin/pedir";
import { classeBotao } from "@/lib/botoes";
import { estilos } from "./estilos";

type Props = { volta: string; saiu: boolean };

export function FormLogin({ volta, saiu }: Props) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixaErro = useRef<HTMLDivElement>(null);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviando(true);
    setErro("");
    const { ok, corpo } = await pedir("/api/admin/login", "POST", {
      usuario: dados.get("usuario"),
      senha: dados.get("senha"),
    });
    if (ok) {
      // Navegação completa: o layout do servidor relê o cookie novo.
      window.location.assign(volta);
      return;
    }
    setErro(corpo.erro ?? "Não foi possível entrar. Tente de novo.");
    setEnviando(false);
    // Leva o foco ao erro: o NVDA lê a mensagem logo depois do envio.
    requestAnimationFrame(() => caixaErro.current?.focus());
  }

  return (
    <form onSubmit={entrar} className="mt-6 flex flex-col gap-5" noValidate>
      {saiu && !erro && (
        <p role="status" className={estilos.caixaOk}>
          Você saiu do admin.
        </p>
      )}
      <div ref={caixaErro} tabIndex={-1} role="alert" className={erro ? estilos.caixaErro : "sr-only"}>
        {erro}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="usuario" className={estilos.rotulo}>
          Usuário
        </label>
        <input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={erro ? true : undefined}
          className={estilos.campo}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className={estilos.rotulo}>
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={erro ? true : undefined}
          className={estilos.campo}
        />
      </div>

      <button type="submit" disabled={enviando} className={`${classeBotao("primary")} self-start`}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
