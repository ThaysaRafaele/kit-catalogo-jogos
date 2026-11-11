import { Cabecalho } from "./Cabecalho";
import { FiltrosFases, MapaDeFases } from "./FiltrosSumario";

export function SumarioEsquerda() {
  return (
    <div className="flex flex-col gap-[22px]">
      <Cabecalho rotulo="Sumário">
        Seleção <br />
        de fases
      </Cabecalho>
      <p className="text-[19px] leading-[1.7]">
        Cada jogo é uma fase. Filtre por turma ou por tema e escolha onde começar.
      </p>
      <FiltrosFases />
    </div>
  );
}

export function SumarioDireita() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h3 className="titulo-bloco">Mapa de fases</h3>
      <MapaDeFases />
    </div>
  );
}
