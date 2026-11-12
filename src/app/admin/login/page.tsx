import type { Metadata } from "next";
import { FormLogin } from "@/components/admin/FormLogin";
import { estilos } from "@/components/admin/estilos";
import { destinoSeguro } from "@/lib/admin/origem";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ volta?: string; saiu?: string }> };

export default async function PaginaLogin({ searchParams }: Props) {
  const { volta, saiu } = await searchParams;

  return (
    <div className={`${estilos.cartao} mx-auto max-w-md`}>
      <h1 className={estilos.titulo}>Entrar no admin</h1>
      <p className="mt-3">Área dos professores para alimentar o catálogo dos jogos.</p>
      <FormLogin volta={destinoSeguro(volta)} saiu={saiu === "1"} />
    </div>
  );
}
