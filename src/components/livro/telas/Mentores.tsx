import { Estrela } from "@/components/Estrela";
import { MentorCard } from "@/components/MentorCard";
import type { Mentor } from "@/lib/esquema";
import { Cabecalho } from "./Cabecalho";

export function MentoresAbertura({ mentores }: { mentores: Mentor[] }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <Cabecalho rotulo="Selecione seu guia" className="text-[22px]/[1.5]">
        Seu time de mentores
      </Cabecalho>
      <p className="text-lg leading-[1.6]">
        Toda party precisa de guias. Conheça quem acompanhou os estúdios nesta jornada.
      </p>
      {mentores.map((mentor) => (
        <MentorCard key={mentor.nome} mentor={mentor} />
      ))}
    </div>
  );
}

export function ListaMentores({ mentores }: { mentores: Mentor[] }) {
  // Sobra uma página quando o time termina na esquerda: ela fecha a seção.
  if (mentores.length === 0) {
    return (
      <div className="tela-centro gap-5">
        <Estrela tamanho={96} />
        <p className="max-w-[320px] font-pixelify text-xl font-medium text-vinho">
          Party completa! Agora, às fases dos estúdios.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[22px]">
      {mentores.map((mentor) => (
        <MentorCard key={mentor.nome} mentor={mentor} />
      ))}
    </div>
  );
}
