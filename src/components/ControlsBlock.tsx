import type { Jogo } from "@/lib/esquema";

export function ControlsBlock({ controles }: { controles: Jogo["controles"] }) {
  return (
    <ul className="flex w-full flex-col gap-3.5 rounded-xl border-4 border-tinta bg-papel-claro p-4">
      {controles.map((controle, i) => {
        const temTeclas = controle.teclas.length > 0;
        return (
          <li key={i} className="flex flex-wrap items-center gap-3">
            {temTeclas && (
              <span className="flex flex-wrap gap-1.5">
                {controle.teclas.map((tecla, j) => (
                  <kbd
                    key={j}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border-[3px] border-tinta bg-white px-2.5 font-pixelify text-lg font-medium text-tinta shadow-[0_4px_0_var(--color-tinta),inset_0_-3px_0_#e0d2b4]"
                  >
                    {tecla}
                  </kbd>
                ))}
              </span>
            )}
            {/* A seta acompanha a ação: se a linha quebrar, as duas descem juntas. */}
            <span className="flex min-w-48 flex-1 items-center gap-3">
              {temTeclas && (
                <span aria-hidden="true" className="font-press text-xs text-vinho">
                  ▶
                </span>
              )}
              <span className="text-[17px] font-bold">{controle.acao}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
