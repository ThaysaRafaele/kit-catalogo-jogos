import { ancoraDoJogo } from "@/lib/formato";

type Item = { fase: string; slug: string; nome: string; detalhe: string };

/** Fases em linhas separadas por traço fino: código, nome, detalhe e a seta. */
export function ListaFases({ itens }: { itens: Item[] }) {
  if (itens.length === 0) return null;
  return (
    <ol className="border-b-2 border-linha">
      {itens.map((item) => (
        <li key={item.slug} className="border-t-2 border-linha">
          <a href={`#${ancoraDoJogo(item.slug)}`} className="flex items-center gap-[18px] px-1.5 py-[18px] text-texto no-underline transition-colors hover:bg-papel-escuro hover:text-texto">
            <span aria-hidden="true" className="min-w-[52px] flex-none font-press text-[13px] text-brasa">
              {item.fase}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-pixelify text-[21px] font-medium wrap-anywhere text-tinta">{item.nome}</span>
              <span className="text-base text-suave">{item.detalhe}</span>
            </span>
            <span aria-hidden="true" className="font-press text-xs text-ferrugem">
              ▶
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
