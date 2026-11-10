"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { PixelButton } from "@/components/PixelButton";
import { doisDigitos } from "@/lib/formato";
import { Coracao } from "@/components/Coracao";
import type { Destino, PaginaLivro } from "@/lib/paginas";
import { useBookFlip, type Lado } from "./useBookFlip";

/** Uma página dupla já renderizada no servidor. */
export type DuplaPronta = {
  kind: PaginaLivro["kind"];
  label: string;
  ancora?: string;
  L: ReactNode;
  R: ReactNode;
};

type Props = { ano: number; duplas: DuplaPronta[] };

const CORACOES = 5;
const MOLDURA = "relative mb-9 rounded-lg bg-madeira p-2.5 shadow-[0_10px_0_var(--color-madeira-escura)]";
const LOMBADA =
  "pointer-events-none absolute top-2.5 bottom-2.5 left-1/2 z-2 -ml-12 w-24 bg-[linear-gradient(to_right,rgba(59,31,18,0)_0%,rgba(59,31,18,0.10)_30%,rgba(59,31,18,0.38)_47%,rgba(30,14,6,0.55)_50%,rgba(59,31,18,0.38)_53%,rgba(59,31,18,0.10)_70%,rgba(59,31,18,0)_100%)]";

function campoDeTexto(alvo: EventTarget | null) {
  return alvo instanceof HTMLElement && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName));
}

const idDaDupla = (dupla: DuplaPronta, idx: number) => dupla.ancora ?? `dupla-${idx + 1}`;

type PropsBorda = {
  dir: "next" | "prev";
  ativo: boolean;
  aoPressionar: (dir: "next" | "prev", e: PointerEvent<HTMLElement>) => void;
  aoArrastar: (e: PointerEvent<HTMLElement>) => void;
  aoSoltar: () => void;
  aoCancelar: () => void;
};

/**
 * Borda externa da página, na altura inteira: um toque vira a página e arrastar dobra o
 * canto. Decorativa para leitores de tela: os botões Voltar e Continue fazem o mesmo.
 */
function Borda({ dir, ativo, aoPressionar, aoArrastar, aoSoltar, aoCancelar }: PropsBorda) {
  const voltar = dir === "prev";
  return (
    <div
      aria-hidden="true"
      title={voltar ? "Toque ou arraste para voltar a página" : "Toque ou arraste para virar a página"}
      onPointerDown={(e) => aoPressionar(dir, e)}
      onPointerMove={aoArrastar}
      onPointerUp={aoSoltar}
      onPointerCancel={aoCancelar}
      // pan-y: um gesto vertical que começa na borda rola a página em vez de virar.
      className={`group absolute top-2.5 bottom-2.5 z-6 w-6 cursor-pointer touch-pan-y select-none from-[rgba(30,14,6,0.10)] to-transparent min-[821px]:w-10 ${
        voltar ? "left-2.5 hover:bg-linear-to-r" : "right-2.5 hover:bg-linear-to-l"
      }`}
      style={{ pointerEvents: ativo ? "auto" : "none" }}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 19 19"
        shapeRendering="crispEdges"
        className={`absolute bottom-0 block opacity-85 transition-opacity group-hover:opacity-100 ${
          voltar ? "left-0 -scale-x-100" : "right-0"
        }`}
      >
        <path
          fill="#e8d3a6"
          d="M19 7v12h-12v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1z"
        />
        <path
          className="fill-madeira"
          d="M18 8h1v1h-1zM17 9h1v1h-1zM16 10h1v1h-1zM15 11h1v1h-1zM14 12h1v1h-1zM13 13h1v1h-1zM12 14h1v1h-1zM11 15h1v1h-1zM10 16h1v1h-1zM9 17h1v1h-1zM8 18h1v1h-1z"
        />
      </svg>
    </div>
  );
}

export function Livro({ ano, duplas }: Props) {
  const livro = useBookFlip(duplas.map((dupla) => dupla.ancora));
  const { p, k, total, estreito, leitura, animando, cena, refs } = livro;
  /**
   * Para onde vai o foco depois da virada. "livro": quem usou um botão ou link de dentro
   * da página o perde, e o foco vai para o livro. "seSumir": Voltar, Continue e as setas
   * mantêm o foco onde está, a não ser que ele se perca (o Continue desabilitado no fim).
   */
  const foco = useRef<"livro" | "seSumir" | null>(null);

  useEffect(() => {
    if (animando) return;
    // Um botão que acabou de ser desabilitado ainda aparece como focado neste momento.
    const ativo = document.activeElement;
    const perdido = !ativo || ativo === document.body || ativo.matches(":disabled");
    if (foco.current === "livro" || (foco.current === "seSumir" && perdido)) {
      refs.palco.current?.focus({ preventScroll: true });
    }
    foco.current = null;
  }, [p, animando, refs.palco]);

  function folhear(virou: boolean) {
    if (virou) foco.current = "seSumir";
  }

  // Tocar ou arrastar a borda segue a mesma regra de foco de Voltar e Continue.
  const borda = {
    ...livro.borda,
    aoPressionar: (dir: "next" | "prev", e: PointerEvent<HTMLElement>) => {
      foco.current = "seSumir";
      livro.borda.aoPressionar(dir, e);
    },
  };

  // Ao entrar no modo leitura (pelo botão ou por movimento reduzido), a dupla atual
  // continua à vista, inclusive a que veio de ?p= no endereço.
  const secaoAtual = idDaDupla(duplas[k], k);
  useEffect(() => {
    if (leitura && k > 0) document.getElementById(secaoAtual)?.scrollIntoView();
    // Só na troca de modo: no modo leitura a página não muda.
  }, [leitura]);

  // Setas viram a página; Home volta para a capa. O ouvinte é um só e lê a versão
  // mais recente das ações pela ref.
  const teclas = useRef({ leitura, proxima: livro.proxima, anterior: livro.anterior, inicio: () => livro.flipTo(0) });
  useEffect(() => {
    teclas.current = { leitura, proxima: livro.proxima, anterior: livro.anterior, inicio: () => livro.flipTo(0) };
  });
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const t = teclas.current;
      if (t.leitura || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || campoDeTexto(e.target)) return;
      const virar = { ArrowRight: t.proxima, ArrowLeft: t.anterior, Home: t.inicio }[e.key];
      if (!virar) return;
      // Home também deixa o navegador subir a página, que é o que a tecla faz por padrão.
      if (e.key !== "Home") e.preventDefault();
      if (virar()) foco.current = "seSumir";
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const pagina = ({ idx, side }: Lado) => duplas[idx][side];

  function irPara(idx: number) {
    if (idx < 0) return;
    if (leitura) {
      const secao = document.getElementById(idDaDupla(duplas[idx], idx));
      secao?.scrollIntoView();
      secao?.focus({ preventScroll: true });
      return;
    }
    if (livro.flipTo(idx * 2)) foco.current = "livro";
  }

  const indiceDe = (destino: Destino) => duplas.findIndex((dupla) => dupla.kind === destino);

  // Botões e links das telas (Let's play, slots, fases, Jogar de novo) são tratados aqui,
  // assim as telas continuam no servidor.
  function aoClicar(e: MouseEvent) {
    const alvo = (e.target as Element).closest<HTMLElement>("[data-ir], a[href^='#']");
    if (!alvo) return;
    const destino = alvo.dataset.ir as Destino | undefined;
    const idx = destino
      ? indiceDe(destino)
      : duplas.findIndex((dupla) => dupla.ancora && `#${dupla.ancora}` === alvo.getAttribute("href"));
    if (idx < 0) return;
    e.preventDefault();
    irPara(idx);
  }

  const cheios = Math.max(1, Math.round(((k + 1) / duplas.length) * CORACOES));
  const rotulo = duplas[k].label;
  const aviso = leitura
    ? "Modo leitura ativado: todas as páginas em sequência."
    : estreito
      ? `Página ${p + 1} de ${total}: ${rotulo}`
      : `Páginas ${2 * k + 1} e ${2 * k + 2} de ${total}: ${rotulo}`;
  const paginador = estreito
    ? `PÁG ${doisDigitos(p + 1)} / ${total}`
    : `PÁG ${doisDigitos(2 * k + 1)}–${doisDigitos(2 * k + 2)} / ${total}`;
  const bordasAtivas = !animando || livro.arrastando;
  const { folha } = cena;

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-10 rounded-lg border-4 border-tinta bg-papel px-4 py-2 font-bold text-vinho focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <header className="relative z-2 mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-3.5 px-4 pt-[18px] pb-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* No modo leitura a página não muda, então os corações não diriam o progresso real. */}
          {!leitura && (
            <div role="img" aria-label={`Progresso de leitura: ${cheios} de ${CORACOES} corações`} className="flex gap-1.5">
              {Array.from({ length: CORACOES }, (_, i) => (
                <Coracao key={i} largura={35} vazio={i >= cheios} brilho />
              ))}
            </div>
          )}
          <p className="font-press text-sm text-vinho">LEVEL UP {ano}</p>
        </div>
        {/* Sem "disabled" durante a virada: o livro já ignora o clique, e o foco não se perde. */}
        <nav aria-label="Atalhos do livro" className="flex flex-wrap gap-3">
          <PixelButton label="Sumário" variant="small" onPress={() => irPara(indiceDe("toc"))} />
          <PixelButton label="Modo leitura" variant="toggle" pressed={leitura} onPress={livro.alternarLeitura} />
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1} className="flex-1 px-4 pt-2">
        <p className="sr-only" aria-live="polite">
          {aviso}
        </p>
        <div className="mx-auto max-w-[1240px]">
          {leitura ? (
            <div className="reading" onClick={aoClicar}>
              {duplas.map((dupla, idx) => (
                <section key={idx} id={idDaDupla(dupla, idx)} aria-label={dupla.label} tabIndex={-1} className={MOLDURA}>
                  <div className="spread">
                    <div className="min-w-0 bg-papel">{dupla.L}</div>
                    <div className="min-w-0 bg-papel">{dupla.R}</div>
                  </div>
                  <div aria-hidden="true" className={`${LOMBADA} hidden min-[821px]:block`} />
                </section>
              ))}
            </div>
          ) : (
            <>
              <div
                ref={refs.palco}
                role="region"
                aria-label="Livro aberto"
                aria-busy={animando}
                tabIndex={-1}
                className={MOLDURA}
                onClick={aoClicar}
              >
                {estreito ? (
                  <>
                    <div className="min-w-0 rounded bg-papel" style={{ pointerEvents: animando ? "none" : "auto" }}>
                      {pagina(cena.estaticas[0])}
                    </div>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-2.5 bottom-2.5 left-2.5 z-2 w-7 bg-[linear-gradient(to_right,rgba(30,14,6,0.40),rgba(59,31,18,0.12)_50%,rgba(59,31,18,0))]"
                    />
                  </>
                ) : (
                  <>
                    <div className="spread" style={{ pointerEvents: animando ? "none" : "auto" }}>
                      <div className="min-w-0 rounded-l bg-papel">{pagina(cena.estaticas[0])}</div>
                      <div className="min-w-0 rounded-r bg-papel">{pagina(cena.estaticas[1])}</div>
                    </div>
                    <div aria-hidden="true" className={LOMBADA} />
                  </>
                )}

                {/* A folha que dobra é só imagem: o conteúdo real é a página parada embaixo. */}
                {folha && (
                  <div
                    aria-hidden="true"
                    inert
                    className="pointer-events-none absolute top-2.5 bottom-2.5 z-4"
                    style={{ left: folha.left, width: folha.width }}
                  >
                    {/* Sombra que a dobra projeta na página de baixo. */}
                    <div ref={refs.sob} className="absolute inset-0 opacity-0" />
                    <div ref={refs.frente} className="absolute inset-0 overflow-hidden bg-papel">
                      {pagina(folha.frente)}
                      <div ref={refs.frenteSombra} className="absolute inset-0 opacity-0" />
                    </div>
                    <div ref={refs.aba} className="absolute inset-0 opacity-0 drop-shadow-[0_0_12px_rgba(30,14,6,0.35)]">
                      <div ref={refs.abaPagina} className="absolute top-0 left-0 origin-top-left overflow-hidden bg-papel">
                        {folha.verso ? (
                          pagina(folha.verso)
                        ) : (
                          <div className="flex h-full items-center justify-center font-press text-sm text-[#d9bf8c]">
                            LEVEL UP {ano}
                          </div>
                        )}
                        <div ref={refs.abaSombra} className="absolute inset-0" />
                      </div>
                    </div>
                  </div>
                )}

                {!livro.noFim && <Borda dir="next" ativo={bordasAtivas} {...borda} />}
                {!livro.noInicio && <Borda dir="prev" ativo={bordasAtivas} {...borda} />}
              </div>

              <nav aria-label="Folhear páginas" className="mt-1 flex flex-wrap items-center justify-center gap-[18px]">
                <PixelButton
                  label="◀ Voltar"
                  ariaLabel="Voltar"
                  disabled={livro.noInicio}
                  onPress={() => folhear(livro.anterior())}
                />
                <p className="rounded-full border-4 border-tinta bg-papel px-[18px] py-2.5 font-pixelify text-lg font-medium">
                  {paginador}
                </p>
                <PixelButton
                  label="Continue ▶"
                  ariaLabel="Continue"
                  disabled={livro.noFim}
                  onPress={() => folhear(livro.proxima())}
                />
              </nav>
            </>
          )}
        </div>
      </main>
    </>
  );
}
