import { Bloco } from "@/components/Bloco";
import { CharacterSheet } from "@/components/CharacterSheet";
import { ThemeBadge } from "@/components/ThemeBadge";
import type { TelaJogo } from "@/lib/paginas";
import { Marcador } from "./Cabecalho";
import { CamposInfo } from "./CampoInfo";

export function JogoAEsquerda({ s }: { s: TelaJogo }) {
  const { jogo, fase } = s;

  return (
    <div className="flex flex-col gap-5">
      <Marcador>
        Fase {fase} • Turma {jogo.turma}
      </Marcador>
      <h2 className="font-press text-[26px] leading-[1.55] wrap-anywhere text-vinho">{jogo.nome}</h2>
      {jogo.frase && <p className="font-pixelify text-[23px] leading-[1.4] text-suave">{jogo.frase}</p>}
      <div>
        <ThemeBadge tema={jogo.tema} />
      </div>
      <div className="mt-2">
        <CamposInfo
          campos={[
            { rotulo: "Gênero", texto: jogo.genero },
            { rotulo: "Plataforma", texto: jogo.plataforma },
            { rotulo: "Turma", texto: jogo.turma },
            { rotulo: "Estúdio", texto: jogo.estudio },
          ]}
        />
      </div>
      {jogo.sinopse && (
        <Bloco titulo="Sinopse">
          <p className="text-[19px] leading-[1.75]">{jogo.sinopse}</p>
        </Bloco>
      )}
    </div>
  );
}

export function JogoADireita({ s }: { s: TelaJogo }) {
  const { protagonista, antagonista } = s.jogo;

  return (
    <div className="flex flex-col gap-[18px]">
      <h3 className="titulo-bloco">Personagens</h3>
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
        <p aria-hidden="true" className="self-center justify-self-center font-press text-sm text-brasa">
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
