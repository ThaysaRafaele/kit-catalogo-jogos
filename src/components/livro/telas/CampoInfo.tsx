type Campo = { rotulo: string; texto: string };

/** Caixas de rótulo e texto em duas colunas. Campos vazios saem; sem nenhum, nada aparece. */
export function CamposInfo({ campos }: { campos: Campo[] }) {
  const preenchidos = campos.filter((campo) => campo.texto);
  if (preenchidos.length === 0) return null;

  return (
    <dl className="duo">
      {preenchidos.map((campo) => (
        <div key={campo.rotulo} className="rounded-[10px] border-[3px] border-tinta bg-papel-claro px-3 py-2.5">
          <dt className="rotulo">{campo.rotulo}</dt>
          <dd className="mt-1 text-base wrap-anywhere">{campo.texto}</dd>
        </div>
      ))}
    </dl>
  );
}
