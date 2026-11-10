import { ControlsBlock } from "@/components/ControlsBlock";
import { MolduraGaleria } from "@/components/DrawingFrame";
import { TeamCredits } from "@/components/TeamCredits";
import { juntar } from "@/lib/formato";
import type { TelaJogo } from "@/lib/paginas";
import { CamposInfo } from "./CampoInfo";

export function JogoBEsquerda({ s }: { s: TelaJogo }) {
  const { jogo, fase } = s;
  const { mundo } = jogo;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-pixelify text-[17px] font-medium wrap-anywhere text-vinho uppercase">
        Fase {fase} • {jogo.nome}
      </p>
      <h2 className="font-press text-[22px] leading-[1.4] text-vinho uppercase">O mundo</h2>
      <MolduraGaleria
        src={mundo.desenho.src}
        alt={mundo.desenho.alt}
        altura={290}
        legenda={juntar(mundo.lugar, mundo.epoca)}
      />
      {mundo.caracteristicas.length > 0 && (
        <>
          <h3 className="mt-1 font-pixelify text-xl font-medium">Características visuais</h3>
          <ol className="flex flex-col gap-2">
            {mundo.caracteristicas.map((caracteristica, i) => (
              <li key={i} className="flex items-center gap-3 text-[17px]">
                <span
                  aria-hidden="true"
                  className="flex size-8 flex-none items-center justify-center rounded-md border-[3px] border-tinta bg-laranja font-press text-xs text-tinta"
                >
                  {i + 1}
                </span>
                {caracteristica}
              </li>
            ))}
          </ol>
        </>
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
    <div className="flex flex-col gap-5">
      {jogo.controles.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-press text-base text-vinho uppercase">Como se joga</h3>
          <ControlsBlock controles={jogo.controles} />
        </div>
      )}
      {(jogo.desafio || jogo.solucao) && (
        <div className="flex flex-col gap-2.5 rounded-xl border-4 border-tinta bg-papel-claro px-[18px] py-4">
          <h3 className="font-press text-sm leading-[1.5] text-vinho uppercase">Bastidores • diário de dev</h3>
          {jogo.desafio && (
            <>
              <p className="font-pixelify text-base font-medium text-vinho uppercase">&gt; Log 01: maior desafio</p>
              <p className="text-[17px] leading-[1.6]">{jogo.desafio}</p>
            </>
          )}
          {jogo.solucao && (
            <>
              <p className="font-pixelify text-base font-medium text-[#2f6b2a] uppercase">
                &gt; Log 02: como resolvemos
              </p>
              <p className="text-[17px] leading-[1.6]">{jogo.solucao}</p>
            </>
          )}
        </div>
      )}
      {(jogo.estudio || equipe.length > 0) && (
        <TeamCredits titulo="Equipe" subtitulo={jogo.estudio} linhas={equipe} />
      )}
      <div className="flex flex-wrap items-center gap-[18px]">
        {jogo.link && (
          <a
            href={jogo.link}
            className="inline-flex min-h-11 items-center gap-2.5 rounded-[14px] border-4 border-tinta bg-laranja px-6 py-3.5 font-press text-base text-tinta uppercase shadow-bloco"
          >
            <span aria-hidden="true">▶</span>
            Jogar<span className="sr-only"> {jogo.nome}</span>
          </a>
        )}
        <div
          role="img"
          aria-label="Espaço para o QR code do jogo"
          className="flex size-[88px] items-center justify-center rounded-lg border-4 border-dashed border-terra text-center font-pixelify text-[15px] text-madeira"
        >
          QR code
        </div>
      </div>
    </div>
  );
}
