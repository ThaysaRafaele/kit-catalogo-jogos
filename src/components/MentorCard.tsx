import type { Mentor } from "@/lib/esquema";

const ROTULO = "font-pixelify text-[15px] font-bold text-vinho uppercase";

function ListaMarcada({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <p className={`mb-1.5 ${ROTULO}`}>{titulo}</p>
      <ul className="flex flex-col gap-1.5">
        {itens.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-base">
            <span aria-hidden="true" className="size-2.5 flex-none border-2 border-tinta bg-laranja" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MentorCard({ mentor }: { mentor: Mentor }) {
  const { nome, foto, lider, classe, skills, specialAbility, sideQuests, funFact, disciplinas } = mentor;

  return (
    <article className="w-full overflow-hidden rounded-xl border-4 border-tinta bg-carta shadow-bloco">
      {lider && (
        <p className="border-b-4 border-tinta bg-[#f2c230] px-3.5 py-2.5 text-center font-press text-[13px] tracking-[1px] text-tinta uppercase">
          <span aria-hidden="true">★ </span>
          Líder do clã
          <span aria-hidden="true"> ★</span>
        </p>
      )}
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex size-24 flex-none items-end justify-center overflow-hidden rounded-[10px] border-4 border-tinta bg-ceu">
            {foto ? (
              <img
                src={foto}
                alt={`Foto de ${nome}`}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <svg
                width="80"
                height="80"
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
          <div className="flex min-w-[150px] flex-1 flex-col gap-2">
            <h3 className="font-pixelify text-[22px] leading-[1.2] font-bold text-tinta">{nome}</h3>
            {classe && (
              <p className="inline-flex flex-wrap gap-x-1.5 self-start rounded-md bg-madeira px-2.5 py-[5px] font-pixelify text-[15px] font-bold wrap-anywhere text-papel">
                <span className="text-laranja-claro uppercase">
                  Classe<span className="sr-only">: </span>
                </span>
                <span className="min-w-0">{classe}</span>
              </p>
            )}
          </div>
        </div>

        {skills.length > 0 && (
          <div>
            <p className={`mb-2 ${ROTULO}`}>Skills</p>
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-[20px] border-[3px] border-tinta bg-papel-claro px-3 py-1 text-base font-bold"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        )}

        {specialAbility && (
          <div className="flex items-start gap-2.5 rounded-[10px] bg-floresta px-3.5 py-3 text-white">
            <svg
              width="24"
              height="24"
              viewBox="0 0 7 7"
              shapeRendering="crispEdges"
              aria-hidden="true"
              className="mt-0.5 flex-none"
            >
              <path className="fill-ouro" d="M3 0h1v2h3v1h-1v1h1v3h-1v-1h-1v-1h-1v1h-1v1h-1v-3h1v-1h-1v-1h3z" />
            </svg>
            <div>
              <p className="font-pixelify text-[15px] font-bold text-ouro uppercase">Special ability</p>
              <p className="mt-1 text-base leading-[1.5]">{specialAbility}</p>
            </div>
          </div>
        )}

        <ListaMarcada titulo="Side quests" itens={sideQuests} />
        <ListaMarcada titulo="Disciplinas" itens={disciplinas} />

        {funFact && (
          <div className="rounded-[10px] border-[3px] border-dashed border-terra bg-creme px-3.5 py-2.5">
            <p className={ROTULO}>
              <span aria-hidden="true">? </span>
              Fun fact
            </p>
            <p className="mt-1 text-base leading-[1.5]">{funFact}</p>
          </div>
        )}
      </div>
    </article>
  );
}
