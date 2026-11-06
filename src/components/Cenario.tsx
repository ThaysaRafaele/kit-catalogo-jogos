import type { CSSProperties, ReactNode } from "react";

const NUVENS: { largura: number; style: CSSProperties }[] = [
  { largura: 192, style: { top: 90, left: "3%" } },
  { largura: 256, style: { top: 40, right: "6%" } },
  { largura: 144, style: { top: 420, left: "1%" } },
  { largura: 176, style: { top: 560, right: "1%" } },
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
      <path fill="#d6efff" d="M1 6h14v1h-14z" />
    </svg>
  );
}

function Chao() {
  return (
    <svg width="100%" height="128" shapeRendering="crispEdges" className="absolute bottom-0 left-0">
      <defs>
        <pattern id="chao" width="32" height="128" patternUnits="userSpaceOnUse">
          <rect width="32" height="128" fill="#8b5a2b" />
          <rect y="8" width="32" height="28" className="fill-grama" />
          <rect x="4" y="4" width="4" height="4" className="fill-grama" />
          <rect x="20" y="0" width="4" height="8" className="fill-grama" />
          <rect y="36" width="32" height="6" fill="#3d8a25" />
          <rect x="8" y="60" width="6" height="6" fill="#6e4420" />
          <rect x="22" y="88" width="6" height="6" fill="#6e4420" />
          <rect x="2" y="108" width="4" height="4" fill="#a8743c" />
          <rect x="26" y="52" width="4" height="4" fill="#a8743c" />
        </pattern>
      </defs>
      <rect width="100%" height="128" fill="url(#chao)" />
    </svg>
  );
}

/** Fundo de todas as telas: céu, nuvens pixeladas e chão de grama e terra. */
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
      <div className="relative z-1 flex flex-1 flex-col pb-[170px]">{children}</div>
    </div>
  );
}
