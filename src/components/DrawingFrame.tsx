type Props = {
  src: string;
  alt: string;
  altura: number;
  /** Cor da borda em volta do desenho. */
  accent: string;
};

/** Moldura de carta para o desenho de um personagem, com espaço reservado enquanto ele não chega. */
export function DrawingFrame({ src, alt, altura, accent }: Props) {
  return (
    <figure className="overflow-hidden rounded-xl border-4 border-tinta bg-papel shadow-[0_5px_0_var(--color-tinta)]">
      <div className="m-2.5 overflow-hidden rounded-md border-[3px] bg-white" style={{ borderColor: accent }}>
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="block w-full bg-white object-contain"
            style={{ height: altura }}
          />
        ) : (
          <div
            role="img"
            aria-label={`Espaço para o desenho: ${alt}`}
            className="flex flex-col items-center justify-center gap-2 p-2.5 text-center"
            style={{ height: altura }}
          >
            <svg width="40" height="40" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
              <path
                className="fill-laranja-claro"
                d="M5 0h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h1v-1h1v-1h1v-1h1v-1h-1z"
              />
              <path className="fill-madeira" d="M1 6h1v1h1v1h-2z" />
            </svg>
            <span className="font-pixelify text-base font-medium">Desenho do jogo</span>
          </div>
        )}
      </div>
    </figure>
  );
}
