type Props = {
  largura: number;
  /** Coração apagado, como os que faltam na barra de progresso. */
  vazio?: boolean;
  /** Pixel de brilho no canto. */
  brilho?: boolean;
};

/** Coração pixelado, sempre decorativo: quem usa dá o texto ao leitor de tela. */
export function Coracao({ largura, vazio = false, brilho = false }: Props) {
  return (
    <svg width={largura} height={(largura * 6) / 7} viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden="true">
      <path
        className={vazio ? "fill-terra" : "fill-coracao"}
        d="M1 0h2v1h1v-1h2v1h1v2h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-2h1z"
      />
      {brilho && !vazio && <path fill="#ffffff" d="M1 1h1v1h-1z" />}
    </svg>
  );
}
