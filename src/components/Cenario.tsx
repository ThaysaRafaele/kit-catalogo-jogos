import type { CSSProperties, ReactNode } from "react";

const NUVENS: { largura: number; style: CSSProperties }[] = [
  { largura: 128, style: { top: 120, left: "2%", opacity: 0.85 } },
  { largura: 176, style: { top: 20, right: "8%", opacity: 0.85 } },
  { largura: 96, style: { top: 520, right: "1.5%", opacity: 0.7 } },
];

function Nuvem({ largura, style }: { largura: number; style: CSSProperties }) {
  return (
    <svg
      width={largura}
      height={largura / 2}
      viewBox="0 0 16 8"
      shapeRendering="crispEdges"
      className="absolute"
      style={style}
    >
      <path fill="#ffffff" d="M4 2h3v-1h3v1h2v1h2v1h1v3h-15v-2h1v-1h2v-1h1z" />
    </svg>
  );
}

function Chao() {
  return (
    <svg width="100%" height="64" shapeRendering="crispEdges" className="absolute bottom-0 left-0">
      <defs>
        <pattern id="chao" width="32" height="64" patternUnits="userSpaceOnUse">
          <rect width="32" height="64" fill="#9a6a3e" />
          <rect y="6" width="32" height="14" className="fill-grama" />
          <rect x="6" y="3" width="3" height="3" className="fill-grama" />
          <rect x="22" y="0" width="3" height="6" className="fill-grama" />
          <rect y="20" width="32" height="4" fill="#5ea844" />
          <rect x="9" y="36" width="4" height="4" fill="#87592f" />
          <rect x="24" y="50" width="4" height="4" fill="#87592f" />
        </pattern>
      </defs>
      <rect width="100%" height="64" fill="url(#chao)" />
    </svg>
  );
}

/** Fundo de todas as telas: céu claro, nuvens pixeladas e uma faixa de grama e terra. */
export function Cenario({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden font-nunito text-texto">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {NUVENS.map((nuvem) => (
          <Nuvem key={nuvem.largura} {...nuvem} />
        ))}
        <Chao />
      </div>
      {/* O respiro inferior mantém o conteúdo acima do chão, como no protótipo. */}
      <div className="relative z-1 flex flex-1 flex-col pb-[110px]">{children}</div>
    </div>
  );
}
