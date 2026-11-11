/** Professores com acesso ao admin, lidos de ADMIN_USUARIOS (JSON). */
import { z } from "zod";
import { PREFIXO_HASH } from "./senha.ts";

const usuariosSchema = z.array(
  z.object({
    usuario: z.string().min(1),
    nome: z.string().min(1),
    hash: z.string().startsWith(PREFIXO_HASH, "gere o hash com npm run admin:senha"),
  }),
);

export type Usuario = z.infer<typeof usuariosSchema>[number];

export function lerUsuarios(): Usuario[] {
  const bruto = process.env.ADMIN_USUARIOS;
  if (!bruto) throw new Error("Configure ADMIN_USUARIOS (veja o .env.example).");
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    throw new Error("ADMIN_USUARIOS não é um JSON válido.");
  }
  const resultado = usuariosSchema.safeParse(dados);
  if (!resultado.success) throw new Error(`ADMIN_USUARIOS inválido: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

export function buscarUsuario(usuario: string): Usuario | undefined {
  const procurado = usuario.trim().toLowerCase();
  return lerUsuarios().find((u) => u.usuario.toLowerCase() === procurado);
}
