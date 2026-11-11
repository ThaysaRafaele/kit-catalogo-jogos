import { LogoCurso, LogoEscola } from "@/components/Logos";
import { PixelButton } from "@/components/PixelButton";
import type { ContextoLivro } from "@/lib/paginas";

export function CapaEsquerda({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="tela-centro justify-between gap-8">
      <div className="flex flex-wrap items-center justify-center gap-[18px]">
        <LogoEscola tamanho={92} />
        <LogoCurso tamanho={116} />
      </div>
      <div className="flex flex-col items-center gap-5">
        <p className="titulo-bloco tracking-[0.18em]">Mostra Cultural</p>
        <h1 className="font-press text-[56px] leading-[1.25] text-vinho uppercase [text-shadow:4px_4px_0_var(--color-laranja-claro)]">
          Level <br />
          Up
        </h1>
        <p className="font-press text-lg tracking-[0.2em] text-tinta">{ctx.edicao.ano}</p>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-pixelify text-[28px] font-medium text-tinta">Catálogo dos Jogos</p>
        <p className="text-[17px] text-suave">Programação de Jogos Digitais • CEEP Hércules Maymone</p>
      </div>
    </div>
  );
}

export function CapaDireita() {
  return (
    <div className="tela-centro gap-[34px]">
      <p className="blink font-press text-lg tracking-[0.08em] text-vinho uppercase">Press start</p>
      <nav aria-label="Menu inicial" className="flex w-full max-w-[280px] flex-col gap-3.5">
        <PixelButton label="Let's play" destino="save" />
        <PixelButton label="Menu" variant="secondary" destino="toc" />
        <PixelButton label="Continue" variant="secondary" destino="intro" />
      </nav>
      <p className="max-w-[30ch] text-base leading-[1.6] text-suave">
        Use as setas, os botões ou a borda da página para folhear.
      </p>
    </div>
  );
}
