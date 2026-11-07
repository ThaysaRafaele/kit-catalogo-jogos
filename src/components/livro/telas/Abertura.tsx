import { ThemeBadge } from "@/components/ThemeBadge";
import type { ContextoLivro } from "@/lib/paginas";
import { Cabecalho } from "./Cabecalho";

export function AberturaEsquerda({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <Cabecalho rotulo="Tutorial" className="text-[26px]/[1.4]">
        O curso
      </Cabecalho>
      <p className="text-lg leading-[1.65]">
        No curso técnico de Programação de Jogos Digitais do CEEP Hércules Maymone, estudantes criam
        jogos do zero: ideia, roteiro, personagens, cenários, programação e testes.
      </p>
      <p className="text-lg leading-[1.65]">
        Cada turma se organiza em estúdios. Cada estúdio tem roteiristas, artistas, programadores e
        testadores, como uma equipe de verdade.
      </p>
      {ctx.edicao.textoAbertura && (
        <div className="rounded-xl border-4 border-tinta bg-papel-claro px-5 py-[18px] shadow-bloco">
          <h3 className="mb-2 font-pixelify text-lg font-medium text-vinho uppercase">Missão principal</h3>
          <p className="text-[17px] leading-[1.6]">{ctx.edicao.textoAbertura}</p>
        </div>
      )}
    </div>
  );
}

export function AberturaDireita({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <Cabecalho rotulo="Evento" className="text-[26px]/[1.4]">
        A Mostra
      </Cabecalho>
      <p className="text-lg leading-[1.65]">
        Na Mostra Cultural LEVEL UP {ctx.edicao.ano}, cada estúdio apresenta seu jogo ao público.
        Personagens e cenários deste catálogo foram desenhados à mão e depois escaneados, ou feitos no
        computador, por pixel art.
      </p>
      <h3 className="mt-1 font-pixelify text-xl font-medium">Temas desta edição</h3>
      <div className="flex flex-col items-start gap-3">
        <ThemeBadge tema="folclore" />
        <ThemeBadge tema="scifi" />
      </div>
      <h3 className="mt-2 font-pixelify text-xl font-medium">Como ler este livro</h3>
      <ul className="list-disc pl-[22px] text-[17px] leading-[1.7]">
        <li>Botões Voltar e Continue folheiam as páginas.</li>
        <li>Também dá para arrastar o canto da página com o mouse ou o dedo.</li>
        <li>Sumário leva à seleção de fases.</li>
        <li>Modo leitura mostra tudo em uma página contínua, sem animação.</li>
      </ul>
    </div>
  );
}
