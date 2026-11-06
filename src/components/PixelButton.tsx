type Variante = "primary" | "secondary" | "small" | "chip" | "toggle";

type Props = {
  label: string;
  variant?: Variante;
  pressed?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  ariaLabel?: string;
};

const LARANJA = { background: "var(--color-laranja)", color: "var(--color-tinta)", sombra: "#c86a0a" };
const CREME = { background: "#fff1cf", color: "var(--color-madeira)", sombra: "#e0c48c" };

export function PixelButton({
  label,
  variant = "primary",
  pressed = false,
  disabled = false,
  onPress,
  ariaLabel,
}: Props) {
  const alternavel = variant === "chip" || variant === "toggle";
  const grande = variant === "primary" || variant === "secondary";
  const cores = variant === "secondary" || (alternavel && !pressed) ? CREME : LARANJA;
  const profundidade = grande ? "6px" : "4px";
  const sombraInterna = disabled ? "#cdb994" : cores.sombra;

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-pressed={alternavel ? pressed : undefined}
      aria-label={ariaLabel}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2.5 border-4 border-tinta font-press leading-[1.4] whitespace-nowrap uppercase"
      style={{
        color: cores.color,
        background: disabled ? "#e6d6b8" : cores.background,
        fontSize: grande ? 16 : 12,
        borderRadius: variant === "chip" ? 999 : 14,
        padding: grande ? "16px 28px" : variant === "chip" ? "10px 16px" : "12px 18px",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: `0 ${profundidade} 0 var(--color-tinta), inset 0 -4px 0 ${sombraInterna}`,
        opacity: disabled ? 0.75 : 1,
      }}
    >
      {variant === "toggle" && <span aria-hidden="true">{pressed ? "■" : "□"}</span>}
      {label}
    </button>
  );
}
