import type { Jogo } from "@/lib/esquema";

export function ControlsBlock({ controles }: { controles: Jogo["controles"] }) {
  return (
    <ul className="flex w-full flex-col gap-3.5">
      {controles.map((controle, i) => (
        <li key={i} className="flex flex-wrap items-center gap-3.5">
          {controle.teclas.length > 0 && (
            <span className="flex min-w-[120px] flex-wrap gap-1.5">
              {controle.teclas.map((tecla, j) => (
                <kbd
                  key={j}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border-2 border-tinta bg-papel-claro px-2.5 font-pixelify text-[17px] font-medium text-tinta shadow-bloco-baixo"
                >
                  {tecla}
                </kbd>
              ))}
            </span>
          )}
          <span className="min-w-48 flex-1 text-[17px] font-bold">{controle.acao}</span>
        </li>
      ))}
    </ul>
  );
}
