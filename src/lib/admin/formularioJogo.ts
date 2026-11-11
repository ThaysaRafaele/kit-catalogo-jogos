/**
 * Ponte entre a ficha do jogo (JSON) e o formulário do admin. Roda no navegador e
 * no servidor: o mesmo código prepara o que é gravado nos dois lados.
 */
import { MARCADOR_VAZIO, type Tema } from "../esquema.ts";

export type TipoDesenho = "protagonista" | "antagonista" | "mundo";
export const TIPOS_DESENHO: TipoDesenho[] = ["protagonista", "antagonista", "mundo"];

type Desenho = { src: string; alt: string };

/** O formulário guarda tudo como texto. As teclas, por exemplo, ficam como "W, A, S, D". */
export type EntradaJogo = {
  slug: string;
  turma: string;
  estudio: string;
  nome: string;
  tema: Tema | "";
  genero: string;
  plataforma: string;
  frase: string;
  sinopse: string;
  protagonista: { nome: string; quemE: string; habilidadeEspecial: string; desenho: Desenho };
  antagonista: { nome: string; motivacao: string; relacaoProtagonista: string; desenho: Desenho };
  mundo: {
    lugar: string;
    epoca: string;
    caracteristicas: string[];
    clima: string;
    inspiracao: string;
    desenho: Desenho;
  };
  controles: { acao: string; teclas: string }[];
  desafio: string;
  solucao: string;
  equipe: { nome: string; funcao: string }[];
  link: string;
  autorizacaoImagem: boolean;
};

export const CARACTERISTICAS = 3;

/** Objeto JSON comum (não null, não lista): o formato de toda ficha e edição. */
export function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function srcDesenho(ano: string | number, slug: string, tipo: TipoDesenho) {
  return `/edicoes/${ano}/${slug}/${tipo}.webp`;
}

/** "Heaven Runner!" → "heaven-runner"; "Saci Pererê" → "saci-perere". */
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export const linhaControle = () => ({ acao: "", teclas: "" });
export const linhaEquipe = () => ({ nome: "", funcao: "" });

export function jogoVazio(turma = ""): EntradaJogo {
  const desenho = () => ({ src: "", alt: "" });
  return {
    slug: "",
    turma,
    estudio: "",
    nome: "",
    tema: "",
    genero: "",
    plataforma: "",
    frase: "",
    sinopse: "",
    protagonista: { nome: "", quemE: "", habilidadeEspecial: "", desenho: desenho() },
    antagonista: { nome: "", motivacao: "", relacaoProtagonista: "", desenho: desenho() },
    mundo: {
      lugar: "",
      epoca: "",
      caracteristicas: Array.from({ length: CARACTERISTICAS }, () => ""),
      clima: "",
      inspiracao: "",
      desenho: desenho(),
    },
    controles: [linhaControle()],
    desafio: "",
    solucao: "",
    equipe: [linhaEquipe()],
    link: "",
    autorizacaoImagem: false,
  };
}

/** Texto do JSON para o formulário: o que não é texto, ou ainda tem "PREENCHER", vira campo vazio. */
const texto = (valor: unknown) => (typeof valor === "string" && !valor.includes(MARCADOR_VAZIO) ? valor : "");
const objeto = (valor: unknown) => (ehObjeto(valor) ? valor : {});
const lista = (valor: unknown) => (Array.isArray(valor) ? valor : []);

/**
 * Ficha gravada (qualquer formato) → estado do formulário. Também é por aqui que o
 * servidor confere o que o formulário mandou, então aplicar duas vezes não pode
 * mudar nada: paraFormulario(paraFormulario(x)) é igual a paraFormulario(x).
 */
export function paraFormulario(bruto: unknown): EntradaJogo {
  const j = objeto(bruto);
  const p = objeto(j.protagonista);
  const a = objeto(j.antagonista);
  const m = objeto(j.mundo);
  const desenho = (valor: unknown) => ({ src: texto(objeto(valor).src), alt: texto(objeto(valor).alt) });
  const caracteristicas = lista(m.caracteristicas).map(texto).slice(0, CARACTERISTICAS);

  // As teclas chegam como lista (ficha gravada) ou já como texto (o que o formulário
  // envia ao servidor). Os dois formatos precisam dar o mesmo resultado.
  const teclas = (valor: unknown) =>
    typeof valor === "string" ? texto(valor) : lista(valor).map(texto).filter(Boolean).join(", ");
  const controles = lista(j.controles).map((c) => ({
    acao: texto(objeto(c).acao),
    teclas: teclas(objeto(c).teclas),
  }));
  const equipe = lista(j.equipe).map((e) => ({ nome: texto(objeto(e).nome), funcao: texto(objeto(e).funcao) }));

  return {
    slug: texto(j.slug),
    turma: texto(j.turma),
    estudio: texto(j.estudio),
    nome: texto(j.nome),
    tema: j.tema === "folclore" || j.tema === "scifi" ? j.tema : "",
    genero: texto(j.genero),
    plataforma: texto(j.plataforma),
    frase: texto(j.frase),
    sinopse: texto(j.sinopse),
    protagonista: {
      nome: texto(p.nome),
      quemE: texto(p.quemE),
      habilidadeEspecial: texto(p.habilidadeEspecial),
      desenho: desenho(p.desenho),
    },
    antagonista: {
      nome: texto(a.nome),
      motivacao: texto(a.motivacao),
      relacaoProtagonista: texto(a.relacaoProtagonista),
      desenho: desenho(a.desenho),
    },
    mundo: {
      lugar: texto(m.lugar),
      epoca: texto(m.epoca),
      caracteristicas: [
        ...caracteristicas,
        ...Array.from({ length: CARACTERISTICAS - caracteristicas.length }, () => ""),
      ],
      clima: texto(m.clima),
      inspiracao: texto(m.inspiracao),
      desenho: desenho(m.desenho),
    },
    controles: controles.length > 0 ? controles : [linhaControle()],
    desafio: texto(j.desafio),
    solucao: texto(j.solucao),
    equipe: equipe.length > 0 ? equipe : [linhaEquipe()],
    link: texto(j.link),
    autorizacaoImagem: j.autorizacaoImagem === true,
  };
}

/**
 * Estado do formulário → ficha para gravar. Apara os textos, tira as linhas
 * vazias e aponta os desenhos para o caminho fixo do slug. Campo vazio continua
 * vazio: vira pendência no painel, não erro.
 */
export function paraGravar(e: EntradaJogo, ano: string | number) {
  const t = (valor: string) => valor.trim();
  const slug = t(e.slug);
  const desenho = (d: Desenho, tipo: TipoDesenho) => ({ src: srcDesenho(ano, slug, tipo), alt: t(d.alt) });

  return {
    slug,
    turma: e.turma,
    estudio: t(e.estudio),
    nome: t(e.nome),
    tema: e.tema,
    genero: t(e.genero),
    plataforma: t(e.plataforma),
    frase: t(e.frase),
    sinopse: t(e.sinopse),
    protagonista: {
      nome: t(e.protagonista.nome),
      quemE: t(e.protagonista.quemE),
      habilidadeEspecial: t(e.protagonista.habilidadeEspecial),
      desenho: desenho(e.protagonista.desenho, "protagonista"),
    },
    antagonista: {
      nome: t(e.antagonista.nome),
      motivacao: t(e.antagonista.motivacao),
      relacaoProtagonista: t(e.antagonista.relacaoProtagonista),
      desenho: desenho(e.antagonista.desenho, "antagonista"),
    },
    mundo: {
      lugar: t(e.mundo.lugar),
      epoca: t(e.mundo.epoca),
      caracteristicas: e.mundo.caracteristicas.map(t).filter(Boolean),
      clima: t(e.mundo.clima),
      inspiracao: t(e.mundo.inspiracao),
      desenho: desenho(e.mundo.desenho, "mundo"),
    },
    controles: e.controles
      .map((c) => ({ acao: t(c.acao), teclas: c.teclas.split(",").map(t).filter(Boolean) }))
      .filter((c) => c.acao || c.teclas.length > 0),
    desafio: t(e.desafio),
    solucao: t(e.solucao),
    equipe: e.equipe.map((m) => ({ nome: t(m.nome), funcao: t(m.funcao) })).filter((m) => m.nome || m.funcao),
    // Sem link, a chave nem entra no arquivo (o esquema aceita a ausência).
    link: t(e.link) || undefined,
    autorizacaoImagem: e.autorizacaoImagem,
  };
}

/** Junta as partes preenchidas numa frase terminada em ponto. */
function frase(...partes: string[]) {
  const texto = partes.map((p) => p.trim().replace(/[.;,]+$/, "")).filter(Boolean).join(", ");
  return texto ? `${texto}.` : "";
}

/** Sugestão de texto alternativo a partir do que o aluno escreveu. A pessoa revisa antes de publicar. */
export function sugerirAlt(e: EntradaJogo, tipo: TipoDesenho): string {
  switch (tipo) {
    case "protagonista":
      return frase(e.protagonista.nome, e.protagonista.quemE);
    case "antagonista":
      return frase(
        e.antagonista.nome,
        e.protagonista.nome ? `antagonista que enfrenta ${e.protagonista.nome.trim()}` : "o antagonista do jogo",
      );
    case "mundo": {
      const visuais = e.mundo.caracteristicas.map((c) => c.trim()).filter(Boolean);
      return frase(e.mundo.lugar, visuais.length > 0 ? `com ${visuais.join(", ").toLowerCase()}` : "");
    }
  }
}
