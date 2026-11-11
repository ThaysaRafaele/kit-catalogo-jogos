/**
 * Classes dos botões. Ficam fora do PixelButton (que é de cliente) para que links das
 * telas do servidor, como o "Jogar", usem exatamente o mesmo visual.
 */
export type VarianteBotao = "primary" | "secondary" | "ghost" | "chip" | "toggle" | "icon";

/** Em Press Start, caixa alta e espaçada: os botões principais. */
const PIXEL = "font-press text-[13px] tracking-[0.04em] uppercase border-[3px] rounded-xl text-tinta";
/** Em Pixelify, caixa normal: o botão discreto, os chips e os toggles. */
const LEVE = "font-pixelify border-2 rounded-[10px] px-4 py-2 text-[17px]";
const LIGADO = "bg-tinta text-papel";
const DESLIGADO = "bg-papel-claro/85 text-tinta";

export const BASE_BOTAO =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 border-tinta leading-[1.3] font-bold whitespace-nowrap no-underline disabled:cursor-not-allowed disabled:opacity-40";

export function estiloBotao(variante: VarianteBotao, ligado = false) {
  switch (variante) {
    case "primary":
      return `${PIXEL} bg-laranja px-[26px] py-4 shadow-bloco hover:text-tinta`;
    case "secondary":
      return `${PIXEL} bg-transparent px-6 py-3.5`;
    case "ghost":
      return `${LEVE} ${DESLIGADO}`;
    case "chip":
      return `font-pixelify border-2 rounded-full px-4 py-[7px] text-base ${ligado ? LIGADO : "bg-transparent text-tinta"}`;
    case "toggle":
      return `${LEVE} ${ligado ? LIGADO : DESLIGADO}`;
    case "icon":
      return "font-press text-sm border-2 size-[52px] rounded-full bg-papel text-tinta shadow-bloco-baixo";
  }
}
