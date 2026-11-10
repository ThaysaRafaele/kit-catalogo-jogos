/** Estrela pixelada, sempre decorativa. */
export function Estrela({ tamanho, className }: { tamanho: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      <path className="fill-ouro" d="M3 0h1v2h3v1h-1v1h1v3h-1v-1h-1v-1h-1v1h-1v1h-1v-3h1v-1h-1v-1h3z" />
    </svg>
  );
}
