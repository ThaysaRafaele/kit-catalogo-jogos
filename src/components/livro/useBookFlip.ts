"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";

const DURACAO = 700;
/** Espaço entre a moldura do livro e o papel. */
const MARGEM = 10;
const BORDA = `${MARGEM}px`;
const METADE = `calc(50% - ${MARGEM}px)`;
const INTEIRA = `calc(100% - ${2 * MARGEM}px)`;
/** Abaixo disto, o livro mostra uma página por vez e vira pela borda esquerda (o mesmo de globals.css). */
const CONSULTA_ESTREITA = "(max-width: 820px)";

type Direcao = "next" | "prev";
type Animacao = { dir: Direcao; from: number; to: number; drag: boolean };

/** Uma página do livro: a dupla (idx) e o lado. */
export type Lado = { idx: number; side: "L" | "R" };
type Folha = {
  left: string;
  width: string;
  frente: Lado;
  /** Sem verso, a parte dobrada mostra o fundo com o nome da Mostra. */
  verso: Lado | null;
};
type Cena ={ estaticas: Lado[]; folha: Folha | null };

type Ponto = { x: number; y: number };
type Poligono = [number, number][];

/** Curva cubic-bezier(.645,.045,.355,1), calculada a cada quadro. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (p1: number, p2: number) => 1 - 3 * p2 + 3 * p1;
  const b = (p1: number, p2: number) => 3 * p2 - 6 * p1;
  const c = (p1: number) => 3 * p1;
  const curva = (t: number, p1: number, p2: number) => ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t;
  const inclinacao = (t: number, p1: number, p2: number) => 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1);
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = inclinacao(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (curva(t, x1, x2) - x) / s;
    }
    return curva(Math.max(0, Math.min(1, t)), y1, y2);
  };
}
const EASE = bezier(0.645, 0.045, 0.355, 1);

// Geometria da dobra, como no protótipo: a linha da dobra corta a folha em duas partes.
function recortar(pontos: Poligono, lado: (q: [number, number]) => number): Poligono {
  const saida: Poligono = [];
  pontos.forEach((a, i) => {
    const b = pontos[(i + 1) % pontos.length];
    const fa = lado(a);
    const fb = lado(b);
    if (fa >= 0) saida.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      saida.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return saida;
}

function poligonoCss(pontos: Poligono) {
  if (pontos.length < 3) return "polygon(0 0, 0 0, 0 0)";
  return `polygon(${pontos.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;
}

/** Degradê com as paradas em pixels a partir da linha da dobra (Q), na direção m. */
function degrade(W: number, H: number, Q: Ponto, m: Ponto, paradas: [number, string][]) {
  const angulo = (Math.atan2(m.x, -m.y) * 180) / Math.PI;
  const L = Math.abs(W * m.x) + Math.abs(H * m.y);
  const t0 = (Q.x - W / 2) * m.x + (Q.y - H / 2) * m.y + L / 2;
  return `linear-gradient(${angulo.toFixed(2)}deg, ${paradas.map(([d, cor]) => `${cor} ${(t0 + d).toFixed(1)}px`).join(", ")})`;
}

/** Brilho na curva do papel e sombra logo depois. */
const PARADAS_ABA: [number, string][] = [
  [0, "rgba(255,255,255,0.55)"], [5, "rgba(255,255,255,0.25)"], [18, "rgba(255,255,255,0)"],
  [40, "rgba(30,14,6,0.10)"], [110, "rgba(30,14,6,0.20)"], [260, "rgba(30,14,6,0.06)"], [700, "rgba(30,14,6,0)"],
];
const PARADAS_FRENTE: [number, string][] = [
  [0, "rgba(30,14,6,0.30)"], [14, "rgba(30,14,6,0.14)"], [60, "rgba(30,14,6,0.04)"], [140, "rgba(30,14,6,0)"],
];
const PARADAS_SOB: [number, string][] = [
  [0, "rgba(30,14,6,0.55)"], [22, "rgba(30,14,6,0.25)"], [100, "rgba(30,14,6,0.07)"], [220, "rgba(30,14,6,0)"],
];

type Geometria = {
  W: number;
  H: number;
  /** Canto que se levanta. */
  C: Ponto;
  /** Onde o canto chega no fim da virada. */
  T: Ponto;
  /** No celular, voltar desdobra a página anterior por cima: o movimento é o inverso. */
  reverso: boolean;
  /** Pontos da lombada: o papel não estica além deles. */
  S1: Ponto;
  S2: Ponto;
  inicio: Ponto;
  fim: Ponto;
  /** Altura do arco no giro automático. */
  arco: number;
};

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lado = (q: number): Lado => ({ idx: Math.floor(q / 2), side: q % 2 ? "R" : "L" });

/** O que fica parado e o que dobra, como no renderVals do protótipo. */
function montarCena(p: number, a: Animacao | null, estreito: boolean): Cena {
  const k = Math.floor(p / 2);
  if (!a) return { estaticas: estreito ? [lado(p)] : [lado(2 * k), lado(2 * k + 1)], folha: null };
  if (estreito) {
    // Avançar dobra a página atual; voltar desdobra a anterior por cima da atual.
    const [fica, dobra] = a.dir === "next" ? [a.to, a.from] : [a.from, a.to];
    return { estaticas: [lado(fica)], folha: { left: BORDA, width: INTEIRA, frente: lado(dobra), verso: null } };
  }
  const kf = Math.floor(a.from / 2);
  const kt = Math.floor(a.to / 2);
  return a.dir === "next"
    ? {
        estaticas: [lado(2 * kf), lado(2 * kt + 1)],
        folha: { left: "50%", width: METADE, frente: lado(2 * kf + 1), verso: lado(2 * kt) },
      }
    : {
        estaticas: [lado(2 * kt), lado(2 * kf + 1)],
        folha: { left: BORDA, width: METADE, frente: lado(2 * kf), verso: lado(2 * kt + 1) },
      };
}

function movimentoReduzido() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Estado e animação do livro, portados do protótipo: flipTo, a dobra que segue o canto
 * (applyP, cons, animP), commit, cancel e o arraste. `duplas` é o número de páginas duplas.
 */
export function useBookFlip(ancoras: (string | undefined)[]) {
  const duplas = ancoras.length;
  const total = duplas * 2;
  const [pagina, setPagina] = useState(0);
  const [anim, setAnim] = useState<Animacao | null>(null);
  const [estreito, setEstreito] = useState(false);
  const [leitura, setLeitura] = useState(false);

  const p = limitar(pagina, 0, total - 1);
  const cena = montarCena(p, anim, estreito);

  const palco = useRef<HTMLDivElement>(null);
  const sob = useRef<HTMLDivElement>(null);
  const frente = useRef<HTMLDivElement>(null);
  const frenteSombra = useRef<HTMLDivElement>(null);
  const aba = useRef<HTMLDivElement>(null);
  const abaPagina = useRef<HTMLDivElement>(null);
  const abaSombra = useRef<HTMLDivElement>(null);

  const ocupado = useRef(false);
  const pendente = useRef<"auto" | "drag" | null>(null);
  const arraste = useRef<Ponto | null>(null);
  const geo = useRef<Geometria | null>(null);
  const ultimoP = useRef<Ponto | null>(null);
  const rolagens = useRef(new Map<string, number>());
  const quadro = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  // Os eventos leem o estado mais recente daqui, sem depender de quando foram criados.
  const atual = useRef({ p, anim, estreito, leitura });
  useLayoutEffect(() => {
    atual.current = { p, anim, estreito, leitura };
  });

  function irParaPalco() {
    const r = palco.current?.getBoundingClientRect();
    if (r && r.top < 0) window.scrollBy(0, r.top - 12);
  }

  function destinoDe(dir: Direcao) {
    const { p, estreito } = atual.current;
    if (estreito) return dir === "next" ? p + 1 : p - 1;
    const k = Math.floor(p / 2);
    return dir === "next" ? (k + 1) * 2 : (k - 1) * 2;
  }

  function flipTo(alvo: number, comArraste = false): boolean {
    const { p, estreito, leitura } = atual.current;
    let q = alvo;
    if (ocupado.current || q < 0 || q >= total) return false;
    if (!estreito) {
      q = Math.floor(q / 2) * 2;
      if (q / 2 === Math.floor(p / 2)) return false;
    } else if (q === p) return false;

    if (leitura || movimentoReduzido()) {
      setPagina(q);
      if (!comArraste) irParaPalco();
      return true;
    }
    ocupado.current = true;
    pendente.current = comArraste ? "drag" : "auto";
    // A página que dobra é uma cópia: ela precisa mostrar o mesmo trecho rolado.
    rolagens.current = new Map(
      [...(palco.current?.querySelectorAll<HTMLElement>("[data-pagina]") ?? [])].map((el) => [
        el.dataset.pagina!,
        el.scrollTop,
      ]),
    );
    setAnim({ dir: q > p ? "next" : "prev", from: p, to: q, drag: comArraste });
    if (!comArraste) irParaPalco();
    return true;
  }

  function pararAnimacao() {
    if (quadro.current !== undefined) cancelAnimationFrame(quadro.current);
    clearTimeout(timer.current);
  }

  /** Termina a virada: com `virou`, a página muda; sem, a folha volta ao lugar. */
  function encerrar(virou: boolean) {
    const a = atual.current.anim;
    ocupado.current = false;
    geo.current = null;
    if (virou && a) setPagina(a.to);
    setAnim(null);
  }
  const concluir = () => encerrar(true);
  const desfazer = () => encerrar(false);

  function montarGeometria(): boolean {
    const { anim: a, estreito } = atual.current;
    const r = palco.current?.getBoundingClientRect();
    if (!a || !r) return false;
    const W = estreito ? r.width - 2 * MARGEM : (r.width - 2 * MARGEM) / 2;
    const H = r.height - 2 * MARGEM;
    if (W < 40 || H < 40) return false;
    // Na dupla, voltar levanta o canto esquerdo; nos outros casos, o direito.
    const esquerda = !estreito && a.dir === "prev";
    const reverso = estreito && a.dir === "prev";
    const C = esquerda ? { x: 0, y: H } : { x: W, y: H };
    const T = esquerda ? { x: 2 * W, y: H } : { x: -W, y: H };
    const x0 = esquerda ? W : 0;
    geo.current = {
      W, H, C, T, reverso,
      S1: { x: x0, y: 0 },
      S2: { x: x0, y: H },
      inicio: reverso ? T : C,
      fim: reverso ? C : T,
      arco: Math.min(H * 0.2, W * 0.45),
    };
    if (abaPagina.current) {
      abaPagina.current.style.width = `${W}px`;
      abaPagina.current.style.height = `${H}px`;
    }
    return true;
  }

  /** O canto não se afasta da lombada mais do que o papel permite. */
  function restringir(P: Ponto): Ponto {
    const g = geo.current!;
    let dx = P.x - g.S2.x;
    let dy = P.y - g.S2.y;
    let d = Math.hypot(dx, dy);
    if (d > g.W) P = { x: g.S2.x + (dx * g.W) / d, y: g.S2.y + (dy * g.W) / d };
    const diagonal = Math.hypot(g.W, g.H);
    dx = P.x - g.S1.x;
    dy = P.y - g.S1.y;
    d = Math.hypot(dx, dy);
    if (d > diagonal) P = { x: g.S1.x + (dx * diagonal) / d, y: g.S1.y + (dy * diagonal) / d };
    return P;
  }

  /** Desenha a dobra com o canto levantado em P. */
  function aplicar(P: Ponto) {
    const g = geo.current;
    const fr = frente.current;
    const ab = abaPagina.current;
    if (!g || !fr || !ab) return;
    const { W, H, C } = g;
    const dx = P.x - C.x;
    const dy = P.y - C.y;
    const comprimento = Math.hypot(dx, dy);
    ultimoP.current = P;
    if (comprimento < 0.5) {
      fr.style.clipPath = "none";
      for (const el of [aba.current, sob.current, frenteSombra.current]) if (el) el.style.opacity = "0";
      return;
    }
    const n = { x: dx / comprimento, y: dy / comprimento };
    const M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
    const ladoDaDobra = (q: [number, number]) => (q[0] - M.x) * n.x + (q[1] - M.y) * n.y;
    const folha: Poligono = [[0, 0], [W, 0], [W, H], [0, H]];
    const resto = recortar(folha, ladoDaDobra);
    const dobra = recortar(folha, (q) => -ladoDaDobra(q));
    // As sombras são mais fortes no meio do movimento.
    const k = Math.sin(Math.PI * Math.min(1, comprimento / (2 * W)));

    fr.style.clipPath = poligonoCss(resto);
    if (frenteSombra.current) {
      frenteSombra.current.style.background = degrade(W, H, M, n, PARADAS_FRENTE);
      frenteSombra.current.style.opacity = String(k);
    }
    if (sob.current) {
      sob.current.style.clipPath = poligonoCss(dobra);
      sob.current.style.background = degrade(W, H, M, { x: -n.x, y: -n.y }, PARADAS_SOB);
      sob.current.style.opacity = String(Math.max(0.15, k));
    }
    // A aba é o verso refletido na linha da dobra.
    const refletir = (q: Ponto) => {
      const s = 2 * ((q.x - M.x) * n.x + (q.y - M.y) * n.y);
      return { x: q.x - s * n.x, y: q.y - s * n.y };
    };
    const verso = (u: number, v: number) => refletir({ x: W - u, y: v });
    const o = verso(0, 0);
    const ex = verso(1, 0);
    const ey = verso(0, 1);
    ab.style.transform = `matrix(${[ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y].map((v) => v.toFixed(5)).join(",")})`;
    ab.style.clipPath = poligonoCss(dobra.map(([x, y]) => [W - x, y]));
    if (abaSombra.current) {
      abaSombra.current.style.background = degrade(W, H, { x: W - M.x, y: M.y }, { x: n.x, y: -n.y }, PARADAS_ABA);
    }
    if (aba.current) aba.current.style.opacity = dobra.length >= 3 ? "1" : "0";
  }

  function animar(de: Ponto, ate: Ponto, duracao: number, arco: number, aoTerminar: () => void) {
    let t0: number | null = null;
    let feito = false;
    const fim = () => {
      if (feito) return;
      feito = true;
      pararAnimacao();
      aoTerminar();
    };
    pararAnimacao();
    const passo = (agora: number) => {
      if (t0 === null) t0 = agora;
      const x = Math.min(1, (agora - t0) / duracao);
      const e = EASE(x);
      aplicar(
        restringir({
          x: de.x + (ate.x - de.x) * e,
          y: de.y + (ate.y - de.y) * e - arco * Math.sin(Math.PI * e),
        }),
      );
      if (x < 1) quadro.current = requestAnimationFrame(passo);
      else fim();
    };
    quadro.current = requestAnimationFrame(passo);
    // Garantia caso os quadros parem (aba em segundo plano, por exemplo).
    timer.current = window.setTimeout(fim, duracao + 600);
  }

  // A folha só existe depois da renderização: a dobra começa aqui.
  useLayoutEffect(() => {
    const modo = pendente.current;
    if (!modo || !frente.current) return;
    pendente.current = null;
    if (!montarGeometria()) {
      concluir();
      return;
    }
    const g = geo.current!;
    for (const el of frente.current.querySelectorAll<HTMLElement>("[data-pagina]")) {
      el.scrollTop = rolagens.current.get(el.dataset.pagina!) ?? 0;
    }
    aplicar(g.inicio);
    if (modo === "auto") animar(g.inicio, g.fim, DURACAO, g.arco, concluir);
  });

  function aoPressionar(dir: Direcao, e: PointerEvent<HTMLElement>) {
    // Só o botão principal (ou um dedo): o direito abre o menu, não vira a página.
    if (e.button !== 0 || !e.isPrimary || ocupado.current || atual.current.leitura) return;
    const alvo = e.currentTarget;
    const { pointerId, clientX, clientY } = e;
    e.preventDefault();
    if (!flipTo(destinoDe(dir), true) || !ocupado.current) return;
    arraste.current = { x: clientX, y: clientY };
    alvo.setPointerCapture(pointerId);
  }

  function aoArrastar(e: PointerEvent<HTMLElement>) {
    const d = arraste.current;
    const g = geo.current;
    if (!d || !g) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    aplicar(restringir({ x: g.inicio.x + (g.reverso ? 2 * dx : dx), y: g.inicio.y + dy }));
  }

  function aoSoltar() {
    const d = arraste.current;
    const g = geo.current;
    if (!d) return;
    arraste.current = null;
    if (!g) {
      desfazer();
      return;
    }
    const P = ultimoP.current ?? g.inicio;
    // Um toque sem arraste vira a página inteira, com o arco.
    if (Math.hypot(P.x - g.inicio.x, P.y - g.inicio.y) < 6) {
      animar(g.inicio, g.fim, DURACAO, g.arco, concluir);
      return;
    }
    // Depois da metade a virada termina; antes, a folha volta.
    const prog = (P.x - g.inicio.x) / (g.fim.x - g.inicio.x);
    if (prog >= 0.5) animar(P, g.fim, Math.max(220, DURACAO * (1 - prog)), 0, concluir);
    else animar(P, g.inicio, Math.max(220, DURACAO * prog), 0, desfazer);
  }

  /** O navegador assumiu o gesto (rolagem vertical no celular): a folha volta, sem virar. */
  function aoCancelar() {
    const g = geo.current;
    if (!arraste.current) return;
    arraste.current = null;
    if (!g) {
      desfazer();
      return;
    }
    animar(ultimoP.current ?? g.inicio, g.inicio, 220, 0, desfazer);
  }

  // Largura da janela e preferência por menos movimento.
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_ESTREITA);
    const aoMudar = () => {
      pararAnimacao();
      arraste.current = null;
      desfazer();
      setEstreito(consulta.matches);
    };
    setEstreito(consulta.matches);
    if (movimentoReduzido()) setLeitura(true);
    consulta.addEventListener("change", aoMudar);
    return () => {
      consulta.removeEventListener("change", aoMudar);
      pararAnimacao();
    };
  }, []);

  // /2026?p=12 abre direto na página 12, e /2026#jogo-x, no jogo; folhear atualiza o endereço.
  const ancorasRef = useRef(ancoras);
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const idx = hash ? ancorasRef.current.indexOf(hash) : -1;
    const n = Number(new URLSearchParams(window.location.search).get("p"));
    if (idx > 0) setPagina(idx * 2);
    else if (Number.isInteger(n) && n >= 1) setPagina(limitar(n - 1, 0, total - 1));
  }, [total]);

  useEffect(() => {
    // A âncora já foi lida acima; daqui em diante o endereço guarda só a página.
    const url = new URL(window.location.href);
    url.hash = "";
    if (p === 0) url.searchParams.delete("p");
    else url.searchParams.set("p", String(p + 1));
    window.history.replaceState(window.history.state, "", url);
  }, [p]);

  const k = Math.floor(p / 2);
  return {
    p,
    k,
    total,
    estreito,
    leitura,
    animando: anim !== null,
    arrastando: anim?.drag ?? false,
    cena,
    noInicio: estreito ? p === 0 : k === 0,
    noFim: estreito ? p === total - 1 : k === duplas - 1,
    refs: { palco, sob, frente, frenteSombra, aba, abaPagina, abaSombra },
    flipTo,
    anterior: () => flipTo(destinoDe("prev")),
    proxima: () => flipTo(destinoDe("next")),
    alternarLeitura: () => {
      if (!ocupado.current) setLeitura((l) => !l);
    },
    borda: { aoPressionar, aoArrastar, aoSoltar, aoCancelar },
  };
}
