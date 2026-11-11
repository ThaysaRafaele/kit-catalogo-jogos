import type { Metadata } from "next";
import { estilos } from "@/components/admin/estilos";

export const metadata: Metadata = { title: "Painel" };

/** Provisório: o painel de verdade (edições e jogos) entra na próxima etapa. */
export default function Painel() {
  return (
    <div className={estilos.cartao}>
      <h1 className={estilos.titulo}>Painel</h1>
      <p className="mt-3">Login funcionando. O painel com as edições e os jogos vem a seguir.</p>
    </div>
  );
}
