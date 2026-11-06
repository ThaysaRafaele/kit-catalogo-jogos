import { LogoCurso, LogoEscola } from "@/components/Logos";
import { PixelButton } from "@/components/PixelButton";
import type { ContextoLivro } from "@/lib/paginas";

export function CapaEsquerda({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="tela-centro gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3.5">
        <LogoEscola tamanho={140} />
        <LogoCurso tamanho={136} />
      </div>
      <p className="font-pixelify text-[17px] font-semibold tracking-[1px] text-vinho uppercase">
        Mostra Cultural • CEEP Hércules Maymone
      </p>
      <h1 className="font-press text-[52px] leading-[1.3] text-vinho uppercase [text-shadow:5px_5px_0_var(--color-laranja-claro)]">
        Level <br />
        Up
      </h1>
      <p className="rounded-[10px] border-4 border-tinta bg-laranja px-5 py-3 font-press text-2xl text-tinta shadow-bloco">
        {ctx.edicao.ano}
      </p>
      <p className="mt-1.5 font-pixelify text-[30px] font-bold text-madeira">Catálogo dos Jogos</p>
      <p className="max-w-[360px] text-lg">Curso de Programação de Jogos Digitais • Campo Grande, MS</p>
    </div>
  );
}

export function CapaDireita({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="tela-centro gap-[26px]">
      <p className="blink font-press text-[22px] text-vinho uppercase">Press start</p>
      <nav aria-label="Menu inicial" className="flex flex-col items-center gap-5">
        <PixelButton label="Let's play" onPress={ctx.goSave} />
        <PixelButton label="Menu" onPress={ctx.goToc} />
        <PixelButton label="Continue" variant="secondary" onPress={ctx.goIntro} />
      </nav>
      <p className="mt-[18px] text-base leading-[1.6]">
        Use os botões Voltar e Continue, ou arraste o canto da página para folhear.
      </p>
      <p className="font-pixelify text-base text-madeira">
        © {ctx.edicao.ano} CEEP Hércules Maymone • Campo Grande, MS
      </p>
    </div>
  );
}
