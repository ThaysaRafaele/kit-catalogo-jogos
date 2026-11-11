"use client";

import { BASE_BOTAO, estiloBotao, type VarianteBotao } from "@/lib/botoes";
import type { Destino } from "@/lib/paginas";

type Props = {
  label: string;
  variant?: VarianteBotao;
  pressed?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  ariaLabel?: string;
  /** Tela do livro que o botão abre; quem folheia é o livro. */
  destino?: Destino;
};

export function PixelButton({
  label,
  variant = "primary",
  pressed = false,
  disabled = false,
  onPress,
  ariaLabel,
  destino,
}: Props) {
  const alternavel = variant === "chip" || variant === "toggle";

  return (
    <button
      type="button"
      onClick={() => onPress?.()}
      disabled={disabled}
      aria-pressed={alternavel ? pressed : undefined}
      aria-label={ariaLabel}
      data-ir={destino}
      className={`${BASE_BOTAO} ${estiloBotao(variant, pressed)}`}
    >
      {variant === "toggle" && <span aria-hidden="true">{pressed ? "■" : "□"}</span>}
      {label}
    </button>
  );
}
