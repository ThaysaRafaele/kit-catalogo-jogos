import { MolduraCarta } from "./DrawingFrame";

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
    <article className="flex min-w-0 flex-col gap-3">
      <p
        className="titulo-bloco flex flex-wrap items-center gap-2.5"
        style={{ color: cor }}
      >
        <span
          aria-hidden="true"
          className="rounded px-[7px] py-[5px] font-press text-[11px] tracking-normal text-white"
          style={{ background: cor }}
        >
          {marca}
        </span>
        {papel}
      </p>
      <MolduraCarta src={desenho.src} alt={desenho.alt} altura={220} accent={cor} />
      {nome && (
        <h4 className="mt-1 font-pixelify text-2xl leading-[1.2] font-medium wrap-anywhere text-tinta">{nome}</h4>
      )}
      {preenchidos.length > 0 && (
        <dl className="flex flex-col">
          {preenchidos.map((campo) => (
            <div key={campo.rotulo} className="divisoria py-2.5">
              <dt className="rotulo">{campo.rotulo}</dt>
              <dd className="mt-1 text-base leading-[1.55] wrap-anywhere">{campo.texto}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
