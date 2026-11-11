import { Coracao } from "@/components/Coracao";
import { LogoCurso, LogoEscola } from "@/components/Logos";
import { PixelButton } from "@/components/PixelButton";
import { TeamCredits } from "@/components/TeamCredits";
import type { ContextoLivro } from "@/lib/paginas";

export function CreditosEsquerda({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="tela-centro gap-7">
      <div className="flex gap-2">
        <Coracao largura={35} />
        <Coracao largura={35} />
        <Coracao largura={35} />
      </div>
      <h2 className="font-press text-[28px] leading-[1.6] text-vinho uppercase">
        Thanks <br />
        for <br />
        playing
      </h2>
      <p className="max-w-[34ch] text-[19px] leading-[1.75]">
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
    <div className="tela-centro gap-6">
      <p aria-hidden="true" className="font-press text-[40px] text-vinho [text-shadow:4px_4px_0_var(--color-laranja-claro)]">
        END
      </p>
      <div className="flex flex-wrap items-center justify-center gap-[18px]">
        <LogoEscola tamanho={120} />
        <LogoCurso tamanho={150} />
      </div>
      <p className="max-w-[30ch] font-pixelify text-[21px] leading-[1.4] font-medium text-tinta">
        Centro Estadual de Educação Profissional Hércules Maymone
      </p>
      <div className="w-full max-w-[400px]">
        <TeamCredits titulo="Créditos da Mostra" subtitulo={`LEVEL UP ${edicao.ano}`} linhas={linhas} />
      </div>
      <PixelButton label="Jogar de novo" variant="secondary" destino="cover" />
      <p className="text-base text-suave">Próximo save: LEVEL UP {edicao.ano + 1}</p>
    </div>
  );
}
