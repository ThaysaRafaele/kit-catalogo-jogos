import { z } from "zod";

/** Marcador usado nos JSON para campo ainda sem conteúdo. */
export const MARCADOR_VAZIO = "PREENCHER";

const desenho = z.object({
  src: z.string(),
  alt: z.string().trim().min(1, "todo desenho precisa de alt"),
});

export const edicaoSchema = z.object({
  ano: z.number().int(),
  titulo: z.string(),
  textoAbertura: z.string(),
  agradecimento: z.string().optional(),
  turmas: z.array(
    z.object({
      id: z.string().min(1),
      lema: z.string().optional(),
      mentor: z.string().optional(),
    }),
  ),
  creditos: z.array(z.object({ funcao: z.string(), nome: z.string() })),
});

export const jogoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use minúsculas, números e hífens"),
  turma: z.string(),
  estudio: z.string(),
  nome: z.string(),
  tema: z.enum(["folclore", "scifi"]),
  genero: z.string(),
  plataforma: z.string(),
  frase: z.string(),
  sinopse: z.string(),
  protagonista: z.object({
    nome: z.string(),
    quemE: z.string(),
    habilidadeEspecial: z.string(),
    desenho,
  }),
  antagonista: z.object({
    nome: z.string(),
    motivacao: z.string(),
    relacaoProtagonista: z.string(),
    desenho,
  }),
  mundo: z.object({
    lugar: z.string(),
    epoca: z.string(),
    caracteristicas: z.array(z.string()).max(3),
    clima: z.string(),
    inspiracao: z.string(),
    desenho,
  }),
  controles: z.array(z.object({ acao: z.string(), teclas: z.array(z.string()) })),
  desafio: z.string(),
  solucao: z.string(),
  equipe: z.array(z.object({ nome: z.string(), funcao: z.string() })),
  link: z.string().optional(),
  autorizacaoImagem: z.boolean(),
});

export const mentoresSchema = z.array(
  z.object({
    nome: z.string().min(1),
    foto: z.string(),
    cargo: z.enum(["coordenação", "professor"]),
    lider: z.boolean(),
    classe: z.string(),
    skills: z.array(z.string()),
    specialAbility: z.string(),
    sideQuests: z.array(z.string()),
    funFact: z.string(),
    disciplinas: z.array(z.string()).optional(),
  }),
);

export type Edicao = z.infer<typeof edicaoSchema>;
export type Jogo = z.infer<typeof jogoSchema>;
export type Mentor = z.infer<typeof mentoresSchema>[number];
export type Tema = Jogo["tema"];
