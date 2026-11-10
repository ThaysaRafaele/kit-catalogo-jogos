import { LogoCurso, LogoEscola } from "@/components/Logos";
import { PixelButton } from "@/components/PixelButton";
import { TeamCredits } from "@/components/TeamCredits";
import type { ContextoLivro } from "@/lib/paginas";

function Coracao() {
  return (
    <svg width="42" height="36" viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden="true">
      <path
        className="fill-coracao"
        d="M1 0h2v1h1v-1h2v1h1v2h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-2h1z"
      />
    </svg>
  );
}

export function CreditosEsquerda({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="tela-centro gap-6">
      <h2 className="font-press text-[30px] leading-[1.5] text-vinho uppercase">
        Thanks <br />
        for <br />
        playing
      </h2>
      <div className="flex gap-2">
        <Coracao />
        <Coracao />
        <Coracao />
      </div>
      <p className="max-w-[420px] text-lg leading-[1.65]">
        Obrigado a cada estudante que desenhou, programou, testou e apresentou. {ctx.edicao.agradecimento}
      </p>
    </div>
  );
}

export function CreditosDireita({ ctx }: { ctx: ContextoLivro }) {
  const { edicao } = ctx;
  const turmas = edicao.turmas.map((turma) => turma.id).join(" • ");
  const linhas = turmas ? [...edicao.creditos, { funcao: "Turmas", nome: turmas }] : edicao.creditos;

  return (
    <div className="tela-centro gap-[22px]">
      <p
        aria-hidden="true"
        className="font-press text-5xl text-vinho [text-shadow:5px_5px_0_var(--color-laranja-claro)]"
      >
        END
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <LogoEscola tamanho={140} />
        <LogoCurso tamanho={164} />
      </div>
      <p className="max-w-[440px] font-pixelify text-[21px] leading-[1.35] font-medium text-tinta">
        Centro Estadual de Educação Profissional Hércules Maymone
      </p>
      <div className="w-full max-w-[420px]">
        <TeamCredits titulo="Créditos da Mostra" subtitulo={`LEVEL UP ${edicao.ano}`} linhas={linhas} />
      </div>
      <PixelButton label="Jogar de novo" onPress={ctx.goStart} />
      <p className="text-base">Próximo save: LEVEL UP {edicao.ano + 1}</p>
    </div>
  );
}
