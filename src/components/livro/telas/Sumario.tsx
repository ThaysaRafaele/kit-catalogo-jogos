import { Cabecalho } from "./Cabecalho";
import { FiltrosFases, MapaDeFases } from "./FiltrosSumario";

export function SumarioEsquerda() {
  return (
    <div className="flex flex-col gap-[18px]">
      <Cabecalho rotulo="Sumário" className="text-[26px]">
        Seleção <br />
        de fases
      </Cabecalho>
      <p className="text-lg leading-[1.6]">
        Cada jogo é uma fase. Filtre por turma ou por tema e escolha onde começar.
      </p>
      <FiltrosFases />
    </div>
  );
}

export function SumarioDireita() {
  return (
    <div className="flex flex-col gap-3.5">
      <h3 className="font-press text-base text-vinho uppercase">Mapa de fases</h3>
      <MapaDeFases />
    </div>
  );
}
