import type { Tema } from "@/lib/esquema";
import { TEMAS } from "@/lib/temas";

const ESTILOS = {
  folclore: {
    background: "var(--color-floresta)",
    color: "#ffffff",
    borda: "#7d4fc0",
    sombra: "#3d1f66",
    icone: (
      <>
        <path fill="#d9c2ff" d="M3 0h3v1h-2v1h-1v4h1v1h2v1h-3v-1h-1v-1h-1v-4h1v-1h1z" />
        <path className="fill-ouro" d="M6 3h1v1h-1z" />
      </>
    ),
  },
  scifi: {
    background: "#12d6ec",
    color: "#170a2e",
    borda: "#ff2e93",
    sombra: "#b3126a",
    icone: (
      <>
        <path fill="#170a2e" d="M3 1h2v1h1v1h1v2h-1v1h-1v1h-2v-1h-1v-1h-1v-2h1v-1h1z" />
        <path fill="#ff2e93" d="M0 4h2v1h-2zM6 3h2v1h-2z" />
        <path fill="#ffffff" d="M3 2h1v1h-1z" />
      </>
    ),
  },
} satisfies Record<Tema, object>;

export function ThemeBadge({ tema }: { tema: Tema }) {
  const { background, color, borda, sombra, icone } = ESTILOS[tema];

  return (
    <span
      className="inline-flex items-center gap-2.5 rounded-lg border-[3px] px-3.5 py-2 font-pixelify text-lg leading-[1.2] font-medium"
      style={{ background, color, borderColor: borda, boxShadow: `0 4px 0 ${sombra}` }}
    >
      <svg width="24" height="24" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
        {icone}
      </svg>
      <span>
        <span>Tema: </span>
        {TEMAS[tema].nome}
      </span>
    </span>
  );
}
