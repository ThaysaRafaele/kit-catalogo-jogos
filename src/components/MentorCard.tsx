import { Bloco } from "@/components/Bloco";
import { Estrela } from "@/components/Estrela";
import type { Mentor } from "@/lib/esquema";

function ListaMarcada({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <Bloco titulo={titulo} compacto>
      <ul className="flex flex-col gap-1.5">
        {itens.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-base">
            <span aria-hidden="true" className="size-2 flex-none bg-laranja" />
            {item}
          </li>
        ))}
      </ul>
    </Bloco>
  );
}

export function MentorCard({ mentor }: { mentor: Mentor }) {
  const { nome, foto, lider, classe, skills, specialAbility, sideQuests, funFact, disciplinas } = mentor;

  return (
    <article className="w-full overflow-hidden rounded-xl border-2 border-tinta bg-papel-claro">
      {lider && (
        <p className="border-b-2 border-tinta bg-[#f2c230] px-3.5 py-2 text-center font-press text-[11px] tracking-[0.08em] text-tinta uppercase">
          <span aria-hidden="true">★ </span>
          Líder do clã
          <span aria-hidden="true"> ★</span>
        </p>
      )}
      <div className="flex flex-col p-[18px]">
        <div className="flex flex-wrap items-center gap-4 pb-3.5">
          <div className="flex size-[84px] flex-none items-end justify-center overflow-hidden rounded-lg border-2 border-tinta bg-ceu">
            {foto ? (
              <img src={foto} alt={`Foto de ${nome}`} loading="lazy" className="size-full object-cover" />
            ) : (
              <svg
                width="72"
                height="72"
                viewBox="0 0 10 10"
                shapeRendering="crispEdges"
                role="img"
                aria-label={`Avatar provisório de ${nome}`}
              >
                <path className="fill-madeira" d="M3 1h4v1h1v3h-1v1h-4v-1h-1v-3h1z" />
                <path fill="#f3c9a0" d="M3 2h4v3h-4z" />
                <path className="fill-madeira" d="M4 3h1v1h-1zM6 3h1v1h-1z" />
                <path className="fill-laranja" d="M2 7h6v1h1v2h-8v-2h1z" />
              </svg>
            )}
          </div>
          <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
            <h3 className="font-pixelify text-[22px] leading-[1.2] font-medium text-tinta">{nome}</h3>
            {classe && (
              <p className="text-base wrap-anywhere">
                <span className="rotulo">
                  Classe<span className="sr-only">:</span>{" "}
                </span>
                {classe}
              </p>
            )}
          </div>
        </div>

        {skills.length > 0 && (
          <Bloco titulo="Skills" compacto>
            <ul className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <li key={skill} className="rounded-[20px] border-2 border-contorno px-3 py-[3px] text-base font-bold">
                  {skill}
                </li>
              ))}
            </ul>
          </Bloco>
        )}

        {specialAbility && (
          <Bloco titulo="Special ability" compacto>
            <p className="flex items-start gap-2.5 text-base leading-[1.5]">
              <Estrela tamanho={20} className="mt-0.5 flex-none" />
              {specialAbility}
            </p>
          </Bloco>
        )}

        <ListaMarcada titulo="Side quests" itens={sideQuests} />
        <ListaMarcada titulo="Disciplinas" itens={disciplinas} />

        {funFact && (
          <Bloco titulo="Fun fact" compacto>
            <p className="text-base leading-[1.5] italic">{funFact}</p>
          </Bloco>
        )}
      </div>
    </article>
  );
}
