import { DrawingFrame } from "./DrawingFrame";

const TIPOS = {
  protagonista: { cor: "#2f6b2a", marca: "P1", papel: "Protagonista" },
  antagonista: { cor: "#7a1424", marca: "Boss", papel: "Antagonista" },
};

type Props = {
  tipo: keyof typeof TIPOS;
  nome: string;
  desenho: { src: string; alt: string };
  campos: { rotulo: string; texto: string }[];
};

export function CharacterSheet({ tipo, nome, desenho, campos }: Props) {
  const { cor, marca, papel } = TIPOS[tipo];
  const preenchidos = campos.filter((campo) => campo.texto);

  return (
    <article className="ficha min-w-0">
      <p
        className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 font-pixelify text-base font-medium tracking-[1px] text-white uppercase"
        style={{ background: cor }}
      >
        <span aria-hidden="true" className="rounded bg-white px-1.5 py-1 font-press text-xs" style={{ color: cor }}>
          {marca}
        </span>
        {papel}
      </p>
      <div className="flex flex-col gap-3 p-3.5">
        <DrawingFrame src={desenho.src} alt={desenho.alt} altura={220} accent={cor} />
        <h4 className="font-pixelify text-2xl leading-[1.2] font-medium wrap-anywhere text-tinta">{nome}</h4>
        {preenchidos.length > 0 && (
          <dl className="flex flex-col gap-2.5">
            {preenchidos.map((campo) => (
              <div key={campo.rotulo} className="border-t-[3px] border-dotted border-[#b89a6a] pt-2">
                <dt className="rotulo">{campo.rotulo}</dt>
                <dd className="mt-1 text-base leading-[1.55]">{campo.texto}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
