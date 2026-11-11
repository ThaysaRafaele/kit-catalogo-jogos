type Campo = { rotulo: string; texto: string };

/** Rótulo e texto em duas colunas, separados por linha fina. Sem nenhum preenchido, nada aparece. */
export function CamposInfo({ campos }: { campos: Campo[] }) {
  const preenchidos = campos.filter((campo) => campo.texto);
  if (preenchidos.length === 0) return null;

  return (
    <dl className="duo gap-y-0">
      {preenchidos.map((campo) => (
        <div key={campo.rotulo} className="divisoria py-3">
          <dt className="rotulo">{campo.rotulo}</dt>
          <dd className="mt-1 text-[17px] wrap-anywhere">{campo.texto}</dd>
        </div>
      ))}
    </dl>
  );
}
