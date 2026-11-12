import type { Metadata } from "next";
import type { ReactNode } from "react";
import { classeBotao } from "@/lib/botoes";
import { sessaoAtual } from "@/lib/admin/servidor";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s • Admin do catálogo" },
  robots: { index: false, follow: false },
};

// O admin lê o repositório a cada visita: nada aqui é gerado no build.
export const dynamic = "force-dynamic";

export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const sessao = await sessaoAtual();

  return (
    <div className="min-h-screen bg-papel-escuro font-nunito text-lg text-texto">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-lg focus:bg-papel-claro focus:p-3"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b-[3px] border-tinta bg-papel">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-press text-sm text-vinho">
            {sessao ? <a href="/admin">Admin do catálogo</a> : "Admin do catálogo"}
          </p>
          {sessao && (
            <div className="flex flex-wrap items-center gap-3">
              <p>
                Você entrou como <strong>{sessao.nome}</strong>
              </p>
              <form method="post" action="/api/admin/sair">
                <button type="submit" className={classeBotao("ghost")}>
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
