import { Bloco } from "@/components/Bloco";
import { ThemeBadge } from "@/components/ThemeBadge";
import type { ContextoLivro } from "@/lib/paginas";
import { Cabecalho } from "./Cabecalho";

export function AberturaEsquerda({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="flex flex-col gap-[22px]">
      <Cabecalho rotulo="Tutorial">O curso</Cabecalho>
      <p className="text-[19px] leading-[1.75]">
        No curso técnico de Programação de Jogos Digitais do CEEP Hércules Maymone, estudantes criam
        jogos do zero: ideia, roteiro, personagens, cenários, programação e testes.
      </p>
      <p className="text-[19px] leading-[1.75]">
        Cada turma se organiza em estúdios. Cada estúdio tem roteiristas, artistas, programadores e
        testadores, como uma equipe de verdade.
      </p>
      {ctx.edicao.textoAbertura && (
        <Bloco titulo="Missão principal" className="mt-3">
          <p className="font-pixelify text-[22px] leading-[1.5] text-tinta">{ctx.edicao.textoAbertura}</p>
        </Bloco>
      )}
    </div>
  );
}

export function AberturaDireita({ ctx }: { ctx: ContextoLivro }) {
  return (
    <div className="flex flex-col gap-[22px]">
      <Cabecalho rotulo="Evento">A Mostra</Cabecalho>
      <p className="text-[19px] leading-[1.75]">
        Na Mostra Cultural LEVEL UP {ctx.edicao.ano}, cada estúdio apresenta seu jogo ao público.
        Personagens e cenários deste catálogo foram desenhados à mão e depois escaneados, ou feitos no
        computador, em pixel art.
      </p>
      <Bloco titulo="Temas desta edição">
        <div className="flex flex-col items-start gap-2.5">
          <ThemeBadge tema="folclore" />
          <ThemeBadge tema="scifi" />
        </div>
      </Bloco>
      <Bloco titulo="Como ler este livro">
        <ul className="list-disc pl-5 text-lg leading-[1.75]">
          <li>Os botões ◀ e ▶ e as setas do teclado folheiam as páginas.</li>
          <li>Também dá para tocar ou arrastar a borda da página.</li>
          <li>Sumário leva à seleção de fases.</li>
          <li>Modo leitura mostra tudo em sequência, sem animação.</li>
        </ul>
      </Bloco>
    </div>
  );
}
