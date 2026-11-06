import { LOGO_CURSO, LOGO_ESCOLA } from "@/lib/marca";

function ImagemLogo({ logo, tamanho }: { logo: typeof LOGO_ESCOLA; tamanho: number }) {
  return (
    <img
      src={logo.grande}
      alt={logo.alt}
      width={tamanho}
      height={tamanho}
      className="block object-contain"
      style={{ width: tamanho, height: tamanho }}
    />
  );
}

export function LogoEscola({ tamanho }: { tamanho: number }) {
  return <ImagemLogo logo={LOGO_ESCOLA} tamanho={tamanho} />;
}

export function LogoCurso({ tamanho }: { tamanho: number }) {
  return <ImagemLogo logo={LOGO_CURSO} tamanho={tamanho} />;
}
