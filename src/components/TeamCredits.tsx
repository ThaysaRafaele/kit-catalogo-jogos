type Props = {
  titulo: string;
  subtitulo?: string;
  linhas: { funcao: string; nome: string }[];
};

/** Créditos em estilo de fim de jogo: função, pontilhado e nome. */
export function TeamCredits({ titulo, subtitulo, linhas }: Props) {
  return (
    <section className="w-full rounded-[10px] bg-noite px-6 py-[22px] text-center text-papel">
      <h3 className="font-press text-[13px] leading-[1.5] tracking-[0.06em] text-[#ffcf5a] uppercase">{titulo}</h3>
      {subtitulo && (
        <p className="mt-2 font-pixelify text-[17px] font-medium text-[#a6e9ff]">{subtitulo}</p>
      )}
      {linhas.length > 0 && (
        <dl className="mt-[18px] flex flex-col gap-2.5">
          {linhas.map((linha, i) => (
            <div key={i} className="flex items-baseline gap-2.5">
              {/* O pontilhado é decoração em CSS: um elemento a mais dentro do <dl> seria inválido. */}
              <dt className="flex min-w-0 flex-1 items-baseline gap-2 text-left font-pixelify text-base font-medium text-[#ffcf5a] after:min-w-4 after:flex-1 after:-translate-y-1 after:border-b-2 after:border-dotted after:border-[#5d4c80] after:content-['']">
                {linha.funcao}
              </dt>
              <dd className="max-w-[60%] text-right text-[17px] font-bold wrap-anywhere text-white">{linha.nome}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
