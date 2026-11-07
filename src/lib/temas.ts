import type { Tema } from "./esquema.ts";

/** Fora de esquema.ts para que os componentes de cliente não carreguem o zod. */
export const TEMAS: Record<Tema, { nome: string; nomeCurto: string }> = {
  folclore: { nome: "Folclore e Lendas Urbanas", nomeCurto: "Folclore" },
  scifi: { nome: "Ficção Científica Retrofuturista", nomeCurto: "Ficção" },
};
