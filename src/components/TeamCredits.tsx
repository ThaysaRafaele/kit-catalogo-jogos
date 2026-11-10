type Props = {
  titulo: string;
  subtitulo?: string;
  linhas: { funcao: string; nome: string }[];
};

/** Créditos em estilo de fim de jogo: função, pontilhado e nome. */
export function TeamCredits({ titulo, subtitulo, linhas }: Props) {
  return (
    <section className="w-full rounded-xl border-4 border-tinta bg-[#20123a] px-5 py-[18px] text-center text-papel shadow-bloco">
      <h3 className="font-press text-[15px] leading-[1.5] text-[#ffcf5a] uppercase">{titulo}</h3>
      {subtitulo && (
        <p className="mt-1.5 font-pixelify text-[17px] font-medium text-[#9ee8ff]">{subtitulo}</p>
      )}
      {linhas.length > 0 && (
        <dl className="mt-3.5 flex flex-col gap-2.5">
          {linhas.map((linha, i) => (
            <div key={i} className="flex items-baseline gap-2">
              {/* O pontilhado é decoração em CSS: um elemento a mais dentro do <dl> seria inválido. */}
              <dt className="flex min-w-0 flex-1 items-baseline gap-2 text-left font-pixelify text-base font-medium text-[#ffcf5a] uppercase after:min-w-4 after:flex-1 after:-translate-y-1 after:border-b-[3px] after:border-dotted after:border-[#7d6aa8] after:content-['']">
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
