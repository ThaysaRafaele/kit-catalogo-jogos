type Desenho = { src: string; alt: string; altura: number };

function Lapis({ tamanho }: { tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <path
        className="fill-laranja-claro"
        d="M5 0h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h1v-1h1v-1h1v-1h1v-1h-1z"
      />
      <path className="fill-madeira" d="M1 6h1v1h1v1h-2z" />
    </svg>
  );
}

type PropsImagem = Desenho & {
  /** Classes do espaço reservado e tamanho do lápis, que mudam de uma moldura para outra. */
  reservado: { className: string; lapis: number; texto: string };
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
      className={`flex flex-col items-center justify-center p-3 text-center ${reservado.className}`}
      style={{ height: altura }}
    >
      <Lapis tamanho={reservado.lapis} />
      <span className={`font-pixelify font-medium ${reservado.texto}`}>Desenho do jogo</span>
    </div>
  );
}

/** Moldura de carta para personagens. */
export function MolduraCarta({ accent, ...desenho }: Desenho & { accent: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border-4 border-tinta bg-papel shadow-[0_5px_0_var(--color-tinta)]">
      <div className="m-2.5 overflow-hidden rounded-md border-[3px] bg-white" style={{ borderColor: accent }}>
        <Imagem {...desenho} reservado={{ className: "gap-2", lapis: 40, texto: "text-base" }} />
      </div>
    </figure>
  );
}

/** Moldura de madeira para o cenário, com legenda. */
export function MolduraGaleria({ legenda, ...desenho }: Desenho & { legenda: string }) {
  return (
    <figure className="flex flex-col items-center">
      <div className="w-full rounded bg-[#7a4520] p-3.5 shadow-[inset_4px_4px_0_#b06b34,inset_-4px_-4px_0_#4a260f,0_6px_0_var(--color-tinta)]">
        <div className="border-[3px] border-tinta bg-papel-claro p-3">
          <Imagem
            {...desenho}
            reservado={{ className: "gap-2.5 border-[3px] border-dashed border-[#8a7a66]", lapis: 48, texto: "text-lg" }}
          />
        </div>
      </div>
      {legenda && (
        <figcaption className="relative top-2.5 -mt-0.5 rounded border-[3px] border-tinta bg-[#e8c35a] px-3.5 py-1.5 text-center font-pixelify text-base font-medium text-tinta shadow-[0_4px_0_var(--color-tinta)]">
          {legenda}
        </figcaption>
      )}
    </figure>
  );
}
