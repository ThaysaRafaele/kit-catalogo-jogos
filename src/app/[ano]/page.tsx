import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cenario } from "@/components/Cenario";
import { BookPage } from "@/components/livro/BookPage";
import { Livro, type DuplaPronta } from "@/components/livro/Livro";
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

export default async function PaginaEdicao({ params }: Props) {
  const { ano } = await params;
  const { edicoes, mentores } = carregarConteudo();
  const edicao = edicoes.find((e) => String(e.ano) === ano);
  if (!edicao) notFound();
  const ctx = { edicao, saves: montarSaves(edicoes, edicao.ano) };

  // As telas são renderizadas aqui, no servidor; o livro só escolhe quais mostrar.
  const duplas = montarPaginas(edicao, mentores).map((s): DuplaPronta => ({
    kind: s.kind,
    label: s.label,
    ancora: "ancora" in s ? s.ancora : undefined,
    L: <BookPage s={s} side="L" ctx={ctx} />,
    R: <BookPage s={s} side="R" ctx={ctx} />,
  }));

  return (
    <Cenario>
      <ProvedorFiltros fases={montarFases(edicao)}>
        <Livro ano={edicao.ano} duplas={duplas} />
      </ProvedorFiltros>
    </Cenario>
  );
}
