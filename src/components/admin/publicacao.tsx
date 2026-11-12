"use client";

/** Peças comuns aos formulários que publicam (jogo, edição, mentor). */
import { useCallback, useEffect, useRef, type ReactNode, type Ref } from "react";
import { classeBotao } from "@/lib/botoes";
import { estilos } from "./estilos";

/** Avisa antes de sair da página com alterações não publicadas. */
export function useAvisoAoSair(alterado: boolean) {
  useEffect(() => {
    if (!alterado) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);
}

/** URLs de prévia (blob) de imagens: criadas aqui e liberadas da memória ao sair da página. */
export function useUrlsDePrevia() {
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const criadas = urls.current;
    return () => criadas.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const criar = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }, []);
  const liberar = useCallback((url: string | null | undefined) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }, []);
  return { criar, liberar };
}

export type Resultado =
  | {
      tipo: "ok";
      /** Links dos commits (vazio no modo local). */
      commits: string[];
      /** Avisos a mais (ex.: desenhos que faltaram, jogos levados para a turma nova). */
      extra?: ReactNode;
    }
  | { tipo: "erro"; texto: string; conflito: boolean };

type Props = {
  resultado: Resultado | null;
  /** Links depois de publicar: catálogo, voltar ao painel... */
  links: { href: string; texto: string; novaAba?: boolean }[];
  ref?: Ref<HTMLDivElement>;
};

/**
 * Caixa do resultado de "Publicar". Recebe o foco quando aparece (quem chama move o
 * foco pelo `ref`), então o leitor de tela lê o resultado logo depois do envio.
 */
export function CaixaResultado({ resultado, links, ref }: Props) {
  return (
    <div ref={ref} tabIndex={-1} className={resultado ? "" : "sr-only"}>
      {resultado?.tipo === "ok" && (
        <div className={`${estilos.caixaOk} flex flex-col gap-2`}>
          <p className="font-bold">
            {resultado.commits.length > 0
              ? "Publicado! O catálogo atualiza em cerca de 2 minutos."
              : "Salvo no modo local: os arquivos do projeto foram atualizados, sem commit."}
          </p>
          {resultado.extra}
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {resultado.commits.map((commit, i) => (
              <li key={commit}>
                <a href={commit} target="_blank" rel="noopener">
                  {resultado.commits.length > 1
                    ? `Ver o commit ${i + 1} de ${resultado.commits.length} no GitHub (abre em nova aba)`
                    : "Ver o commit no GitHub (abre em nova aba)"}
                </a>
              </li>
            ))}
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} {...(link.novaAba ? { target: "_blank", rel: "noopener" } : {})}>
                  {link.novaAba ? `${link.texto} (abre em nova aba)` : link.texto}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {resultado?.tipo === "erro" && (
        <div className={`${estilos.caixaErro} flex flex-col gap-3`}>
          <p className="font-bold">{resultado.texto}</p>
          {resultado.conflito && (
            <>
              <p>Antes de recarregar, guarde o que você digitou (no jogo, use "Salvar rascunho no navegador").</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`${classeBotao("secondary")} self-start`}
              >
                Recarregar a página
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
