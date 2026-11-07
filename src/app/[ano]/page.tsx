import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cenario } from "@/components/Cenario";
import { BookPage } from "@/components/livro/BookPage";
import { ProvedorFiltros } from "@/components/livro/telas/FiltrosSumario";
import { buscarEdicao, carregarConteudo } from "@/lib/conteudo";
import { montarFases, montarPaginas, montarSaves } from "@/lib/paginas";

type Props = { params: Promise<{ ano: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return carregarConteudo().edicoes.map((edicao) => ({ ano: String(edicao.ano) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const edicao = buscarEdicao((await params).ano);
  return { title: edicao?.titulo };
}

// Provisório: mostra as telas prontas em sequência, até o folhear entrar na parte 10.
export default async function PaginaEdicao({ params }: Props) {
  const { ano } = await params;
  const { edicoes } = carregarConteudo();
  const edicao = edicoes.find((e) => String(e.ano) === ano);
  if (!edicao) notFound();
  const ctx = { edicao, saves: montarSaves(edicoes, edicao.ano) };

  return (
    <Cenario>
      <main className="flex-1 px-4 pt-2">
        <ProvedorFiltros fases={montarFases(edicao)}>
          <div className="mx-auto max-w-[1240px]">
            {montarPaginas(edicao).map((s) => (
              <section
                key={s.idx}
                aria-label={s.label}
                className="relative mb-9 rounded-lg bg-madeira p-2.5 shadow-[0_10px_0_var(--color-madeira-escura)]"
              >
                <div className="spread">
                  <div className="min-w-0">
                    <BookPage s={s} side="L" ctx={ctx} />
                  </div>
                  <div className="min-w-0">
                    <BookPage s={s} side="R" ctx={ctx} />
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2.5 bottom-2.5 left-1/2 z-2 -ml-12 hidden w-24 bg-[linear-gradient(to_right,rgba(59,31,18,0)_0%,rgba(59,31,18,0.10)_30%,rgba(59,31,18,0.38)_47%,rgba(30,14,6,0.55)_50%,rgba(59,31,18,0.38)_53%,rgba(59,31,18,0.10)_70%,rgba(59,31,18,0)_100%)] min-[821px]:block"
                />
              </section>
            ))}
          </div>
        </ProvedorFiltros>
      </main>
    </Cenario>
  );
}
