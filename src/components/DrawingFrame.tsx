type Desenho = { src: string; alt: string; altura: number };

function Lapis({ tamanho }: { tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <path
        className="fill-laranja-claro"
        d="M5 0h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h1v-1h1v-1h1v-1h1v-1h-1z"
      />
      <path className="fill-tinta" d="M1 6h1v1h1v1h-2z" />
    </svg>
  );
}

type PropsImagem = Desenho & {
  /** Classes do espaço reservado e tamanho do lápis, que mudam de uma moldura para outra. */
  reservado: { className?: string; lapis: number };
};

/** O desenho, ou o espaço reservado enquanto ele não chega. */
function Imagem({ src, alt, altura, reservado }: PropsImagem) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="block w-full bg-white object-contain"
        style={{ height: altura }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Espaço para o desenho: ${alt}`}
      className={`flex flex-col items-center justify-center gap-2 p-3 text-center text-suave ${reservado.className ?? ""}`}
      style={{ height: altura }}
    >
      <Lapis tamanho={reservado.lapis} />
      <span className="font-pixelify text-[17px] font-medium">Desenho do jogo</span>
    </div>
  );
}

/** Moldura de carta para personagens. */
export function MolduraCarta({ accent, ...desenho }: Desenho & { accent: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border-2 bg-white" style={{ borderColor: accent }}>
      <Imagem {...desenho} reservado={{ lapis: 36 }} />
    </figure>
  );
}

/** Moldura de madeira para o cenário, com legenda. */
export function MolduraGaleria({ legenda, ...desenho }: Desenho & { legenda: string }) {
  return (
    <figure className="flex flex-col items-center">
      <div className="w-full rounded-[3px] bg-[#7a4520] p-2.5 shadow-[inset_3px_3px_0_#a8683a,inset_-3px_-3px_0_#4f2a12,0_14px_22px_-12px_rgba(42,20,6,0.55)]">
        <div className="bg-papel-claro p-3.5">
          <Imagem {...desenho} reservado={{ className: "border-2 border-dashed border-tracejado", lapis: 40 }} />
        </div>
      </div>
      {legenda && (
        <figcaption className="mt-3.5 text-center font-pixelify text-base font-medium text-suave">{legenda}</figcaption>
      )}
    </figure>
  );
}
