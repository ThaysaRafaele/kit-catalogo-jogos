import { CharacterSheet } from "@/components/CharacterSheet";
import { ThemeBadge } from "@/components/ThemeBadge";
import type { TelaJogo } from "@/lib/paginas";

export function JogoAEsquerda({ s }: { s: TelaJogo }) {
  const { jogo, fase } = s;
  const dados = [
    { rotulo: "Gênero", texto: jogo.genero },
    { rotulo: "Plataforma", texto: jogo.plataforma },
    { rotulo: "Turma", texto: jogo.turma },
    { rotulo: "Estúdio", texto: jogo.estudio },
  ].filter((dado) => dado.texto);

  return (
    <div className="flex flex-col gap-[18px]">
      <p className="font-pixelify text-[17px] font-medium text-vinho uppercase">
        Fase {fase} • Turma {jogo.turma}
      </p>
      <h2 className="font-press text-[28px] leading-[1.45] wrap-anywhere text-vinho">{jogo.nome}</h2>
      {jogo.frase && (
        <p className="font-pixelify text-[22px] leading-[1.4] text-madeira">“{jogo.frase}”</p>
      )}
      <div>
        <ThemeBadge tema={jogo.tema} />
      </div>
      <dl className="duo">
        {dados.map((dado) => (
          <div key={dado.rotulo} className="rounded-[10px] border-[3px] border-tinta bg-papel-claro px-3 py-2.5">
            <dt className="rotulo">{dado.rotulo}</dt>
            <dd className="mt-1 text-base">{dado.texto}</dd>
          </div>
        ))}
      </dl>
      {jogo.sinopse && (
        <div className="rounded-xl bg-madeira px-5 py-[18px] text-papel">
          <h3 className="mb-2 font-press text-sm text-laranja-claro uppercase">Sinopse</h3>
          <p className="text-lg leading-[1.65]">{jogo.sinopse}</p>
        </div>
      )}
    </div>
  );
}

export function JogoADireita({ s }: { s: TelaJogo }) {
  const { protagonista, antagonista } = s.jogo;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-press text-lg text-vinho uppercase">Personagens</h3>
      <div className="vs-grid">
        <CharacterSheet
          tipo="protagonista"
          nome={protagonista.nome}
          desenho={protagonista.desenho}
          campos={[
            { rotulo: "Quem é?", texto: protagonista.quemE },
            { rotulo: "Habilidade especial", texto: protagonista.habilidadeEspecial },
          ]}
        />
        <p
          aria-hidden="true"
          className="flex size-14 items-center justify-center justify-self-center rounded-full border-4 border-tinta bg-coracao font-press text-sm text-white shadow-[0_4px_0_var(--color-tinta)]"
        >
          VS
        </p>
        <CharacterSheet
          tipo="antagonista"
          nome={antagonista.nome}
          desenho={antagonista.desenho}
          campos={[
            { rotulo: "Motivação", texto: antagonista.motivacao },
            { rotulo: "Relação com o protagonista", texto: antagonista.relacaoProtagonista },
          ]}
        />
      </div>
    </div>
  );
}
