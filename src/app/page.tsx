import { Cenario } from "@/components/Cenario";
import { edicaoMaisRecente } from "@/lib/conteudo";

/**
 * Em site estático, redirect() só funciona com JavaScript e não gera
 * redirecionamento no HTML. O meta refresh funciona sempre, e o link cobre
 * quem tem o redirecionamento automático desativado.
 */
export default function Inicio() {
  const { ano } = edicaoMaisRecente();

  return (
    <Cenario>
      <meta httpEquiv="refresh" content={`0;url=/${ano}`} />
      <main className="flex flex-1 flex-col items-center gap-4 px-4 pt-16 text-center">
        <h1 className="font-press text-2xl leading-snug text-vinho">Catálogo dos Jogos</h1>
        <p className="text-lg">
          <a href={`/${ano}`}>Abrir a edição {ano}</a>
        </p>
      </main>
    </Cenario>
  );
}
