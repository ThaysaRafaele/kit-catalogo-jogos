import { Bloco } from "@/components/Bloco";
import { ControlsBlock } from "@/components/ControlsBlock";
import { MolduraGaleria } from "@/components/DrawingFrame";
import { TeamCredits } from "@/components/TeamCredits";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";
import { doisDigitos } from "@/lib/formato";
import type { TelaJogo } from "@/lib/paginas";
import { Marcador } from "./Cabecalho";
import { CamposInfo } from "./CampoInfo";

export function JogoBEsquerda({ s }: { s: TelaJogo }) {
  const { jogo, fase } = s;
  const { mundo } = jogo;

  return (
    <div className="flex flex-col gap-5">
      <Marcador>
        Fase {fase} • {jogo.nome}
      </Marcador>
      <h2 className="font-press text-xl leading-[1.6] wrap-anywhere text-vinho uppercase">
        {mundo.lugar || "O mundo"}
      </h2>
      <MolduraGaleria
        src={mundo.desenho.src}
        alt={mundo.desenho.alt}
        altura={290}
        legenda={mundo.epoca}
      />
      {mundo.caracteristicas.length > 0 && (
        <Bloco titulo="Características visuais">
          <ol className="flex flex-col gap-2.5">
            {mundo.caracteristicas.map((caracteristica, i) => (
              <li key={i} className="flex items-baseline gap-3.5 text-lg">
                <span aria-hidden="true" className="flex-none font-press text-xs text-brasa">
                  {doisDigitos(i + 1)}
                </span>
                {caracteristica}
              </li>
            ))}
          </ol>
        </Bloco>
      )}
      <CamposInfo
        campos={[
          { rotulo: "Clima", texto: mundo.clima },
          { rotulo: "Inspiração real", texto: mundo.inspiracao },
        ]}
      />
    </div>
  );
}

export function JogoBDireita({ s }: { s: TelaJogo }) {
  const { jogo } = s;
  const { equipe } = jogo;

  return (
    <div className="flex flex-col gap-6">
      {jogo.controles.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <h3 className="titulo-bloco">Como se joga</h3>
          <ControlsBlock controles={jogo.controles} />
        </div>
      )}
      {(jogo.desafio || jogo.solucao) && (
        <Bloco titulo="Bastidores • Diário de dev">
          {jogo.desafio && (
            <>
              <p className="mt-1.5 font-pixelify text-[17px] font-medium text-tinta">&gt; Log 01: o maior desafio</p>
              <p className="text-lg leading-[1.7]">{jogo.desafio}</p>
            </>
          )}
          {jogo.solucao && (
            <>
              <p className="mt-1.5 font-pixelify text-[17px] font-medium text-[#2a5a26]">
                &gt; Log 02: como resolvemos
              </p>
              <p className="text-lg leading-[1.7]">{jogo.solucao}</p>
            </>
          )}
        </Bloco>
      )}
      {(jogo.estudio || equipe.length > 0) && (
        <TeamCredits titulo="Equipe" subtitulo={jogo.estudio} linhas={equipe} />
      )}
      {jogo.link && (
        <a href={jogo.link} className={`${BASE_BOTAO} ${estiloBotao("primary")} self-start`}>
          <span aria-hidden="true">▶</span>
          Jogar<span className="sr-only"> {jogo.nome}</span>
        </a>
      )}
    </div>
  );
}
