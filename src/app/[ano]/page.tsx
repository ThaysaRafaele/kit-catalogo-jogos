import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cenario } from "@/components/Cenario";
import { buscarEdicao, carregarConteudo } from "@/lib/conteudo";

type Props = { params: Promise<{ ano: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return carregarConteudo().edicoes.map((edicao) => ({ ano: String(edicao.ano) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const edicao = buscarEdicao((await params).ano);
  return { title: edicao?.titulo };
}

// Provisório: o livro entra aqui a partir da parte 1.
export default async function PaginaEdicao({ params }: Props) {
  const edicao = buscarEdicao((await params).ano);
  if (!edicao) notFound();

  return (
    <Cenario>
      <main className="flex flex-1 flex-col items-center gap-4 px-4 pt-16 text-center">
        <h1 className="font-press text-2xl leading-snug text-vinho">{edicao.titulo}</h1>
        <p className="font-pixelify text-xl font-bold text-madeira">Catálogo dos Jogos</p>
        <p className="text-lg">
          {edicao.jogos.length} jogo(s) e {edicao.turmas.length} turma(s) carregados.
        </p>
      </main>
    </Cenario>
  );
}
