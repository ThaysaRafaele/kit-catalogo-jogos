import { juntar } from "@/lib/formato";
import type { TelaTurma } from "@/lib/paginas";
import { TEMAS } from "@/lib/temas";
import { ListaFases } from "./ListaFases";

export function TurmaEsquerda({ s }: { s: TelaTurma }) {
  return (
    <div className="tela-centro gap-7">
      <p className="titulo-bloco tracking-[0.18em]">Mundo {s.mundo}</p>
      <svg width="144" height="144" viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true">
        <path className="fill-tinta" d="M2 1h1v10h-1z" />
        <path className="fill-coracao" d="M3 1h6v1h1v3h-1v1h-6z" />
        <path className="fill-laranja-claro" d="M5 2h2v1h1v1h-1v1h-2v-1h-1v-1h1z" />
        <path className="fill-grama" d="M0 10h11v1h-11z" />
      </svg>
      <h2 className="font-press text-[32px] leading-[1.5] text-vinho uppercase">
        Turma <br />
        {s.turma.id}
      </h2>
      {s.turma.lema && <p className="max-w-[26ch] font-pixelify text-[22px] text-suave">{s.turma.lema}</p>}
    </div>
  );
}

export function TurmaDireita({ s }: { s: TelaTurma }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h3 className="titulo-bloco">Fases deste mundo</h3>
      <ListaFases itens={s.fases.map((f) => ({ ...f, detalhe: juntar(f.estudio, TEMAS[f.tema].nome) }))} />
      {s.turma.mentor && (
        <div className="mt-4">
          <p className="titulo-bloco">Mentor da turma</p>
          <p className="mt-1.5 text-lg">{s.turma.mentor}</p>
        </div>
      )}
    </div>
  );
}
