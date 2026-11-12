/**
 * Ponte entre uma ficha do mentores.json e o formulário do mentor. Roda no
 * navegador e no servidor. Sem o campo "disciplinas", de propósito: a ficha fala
 * da pessoa. Se o arquivo já tiver disciplinas, elas ficam como estão.
 */
import { MARCADOR_VAZIO, mentoresSchema } from "../esquema.ts";
import { conferirComoBuild } from "../limpeza.ts";
import { coletorDeErros, lista, objeto, texto } from "./formulario.ts";
import { gerarSlug } from "./formularioJogo.ts";

export type Cargo = "coordenação" | "professor";
export const CARGOS: { valor: Cargo; nome: string }[] = [
  { valor: "coordenação", nome: "Coordenação" },
  { valor: "professor", nome: "Professor ou professora" },
];

export type EntradaMentor = {
  nome: string;
  cargo: Cargo | "";
  lider: boolean;
  classe: string;
  skills: string[];
  specialAbility: string;
  sideQuests: string[];
  funFact: string;
};

/** O endereço da ficha no admin e o nome da foto: "Thaysa Rafaele" → "thaysa-rafaele". */
export const slugDoMentor = (nome: string) => gerarSlug(nome);
export const fotoDoMentor = (nome: string) => `/mentores/${slugDoMentor(nome)}.webp`;

export function mentorVazio(): EntradaMentor {
  return { nome: "", cargo: "", lider: false, classe: "", skills: [""], specialAbility: "", sideQuests: [""], funFact: "" };
}

const textos = (valor: unknown) => {
  const itens = lista(valor).map(texto);
  return itens.length > 0 ? itens : [""];
};

/** Ficha (ou o que o formulário mandou) → estado do formulário. Aplicar duas vezes não muda nada. */
export function paraFormularioMentor(bruto: unknown): EntradaMentor {
  const m = objeto(bruto);
  return {
    nome: texto(m.nome),
    cargo: m.cargo === "coordenação" || m.cargo === "professor" ? m.cargo : "",
    lider: m.lider === true,
    classe: texto(m.classe),
    skills: textos(m.skills),
    specialAbility: texto(m.specialAbility),
    sideQuests: textos(m.sideQuests),
    funFact: texto(m.funFact),
  };
}

/**
 * Estado do formulário → ficha. Texto vazio vira "PREENCHER" (o `npm run validar`
 * continua avisando o que falta); itens vazios das listas saem.
 */
export function paraGravarMentor(e: EntradaMentor) {
  const t = (valor: string) => valor.trim();
  const nome = t(e.nome);
  return {
    nome,
    foto: fotoDoMentor(nome),
    cargo: e.cargo,
    lider: e.lider,
    classe: t(e.classe) || MARCADOR_VAZIO,
    skills: e.skills.map(t).filter(Boolean),
    specialAbility: t(e.specialAbility) || MARCADOR_VAZIO,
    sideQuests: e.sideQuests.map(t).filter(Boolean),
    funFact: t(e.funFact) || MARCADOR_VAZIO,
  };
}

const ROTULOS: Record<string, string> = {
  nome: "Nome",
  cargo: "Cargo",
  classe: "Classe",
  skills: "Formação",
  specialAbility: "Habilidade especial",
  sideQuests: "Side quests",
  funFact: "Curiosidade",
};

/** `outrosSlugs`: os dos outros mentores, para o nome (e a foto) não repetir. */
export function validarMentor(e: EntradaMentor, outrosSlugs: string[]) {
  const gravar = paraGravarMentor(e);
  const { erros, adicionar } = coletorDeErros(([campo]) => ROTULOS[String(campo)] ?? String(campo));

  if (!gravar.nome) adicionar(["nome"], "Escreva o nome do mentor.");
  else if (!slugDoMentor(gravar.nome)) adicionar(["nome"], "Use pelo menos uma letra ou número no nome.");
  else if (outrosSlugs.includes(slugDoMentor(gravar.nome))) adicionar(["nome"], "Já existe um mentor com este nome.");
  if (!gravar.cargo) adicionar(["cargo"], "Escolha o cargo.");

  // O esquema do build é o da lista inteira: a ficha vai como a única da lista.
  const resultado = conferirComoBuild(mentoresSchema, [gravar]);
  if (!resultado.success) {
    for (const issue of resultado.error.issues) adicionar([String(issue.path[1] ?? "nome")], issue.message);
  }
  return { erros, gravar };
}
