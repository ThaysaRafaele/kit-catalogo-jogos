import { ancoraDoJogo } from "@/lib/formato";
import type { TelaTurma } from "@/lib/paginas";
import { TEMAS } from "@/lib/temas";

export function TurmaEsquerda({ s }: { s: TelaTurma }) {
  return (
    <div className="tela-centro gap-6">
      <p className="rounded-[10px] border-4 border-tinta bg-laranja px-4 py-2.5 font-press text-sm text-tinta uppercase">
        Mundo {s.mundo}
      </p>
      <svg width="176" height="176" viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true">
        <path className="fill-madeira" d="M2 1h1v10h-1z" />
        <path className="fill-coracao" d="M3 1h6v1h1v3h-1v1h-6z" />
        <path className="fill-laranja-claro" d="M5 2h2v1h1v1h-1v1h-2v-1h-1v-1h1z" />
        <path className="fill-grama" d="M0 10h11v1h-11z" />
      </svg>
      <h2 className="font-press text-[34px] leading-[1.4] text-vinho uppercase">
        Turma <br />
        {s.turma.id}
      </h2>
      {s.turma.lema && <p className="font-pixelify text-[22px] text-madeira">{s.turma.lema}</p>}
    </div>
  );
}

export function TurmaDireita({ s }: { s: TelaTurma }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <h3 className="font-press text-base leading-[1.5] text-vinho uppercase">Fases deste mundo</h3>
      <ol className="flex flex-col gap-3.5">
        {s.fases.map((f) => (
          <li key={f.slug}>
            <a
              href={`#${ancoraDoJogo(f.slug)}`}
              className="cartao-fase flex flex-col gap-2.5 p-4"
            >
              <span className="font-pixelify text-base font-medium text-vinho uppercase">Fase {f.fase}</span>
              <span className="text-[19px] font-extrabold">{f.nome}</span>
              <span className="text-base">
                {[f.estudio, TEMAS[f.tema].nome].filter(Boolean).join(" • ")}
              </span>
            </a>
          </li>
        ))}
      </ol>
      {s.turma.mentor && (
        <div className="rounded-[10px] border-[3px] border-tinta bg-papel-claro px-4 py-3.5">
          <p className="rotulo">Mentor da turma</p>
          <p className="mt-1 text-[17px]">{s.turma.mentor}</p>
        </div>
      )}
    </div>
  );
}
