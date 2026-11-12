/** Professores com acesso ao admin, lidos de ADMIN_USUARIOS (JSON). */
import { z } from "zod";
import { PREFIXO_HASH } from "./senha.ts";
import { verificarSessao, type Sessao } from "./sessao.ts";

const usuariosSchema = z.array(
  z.object({
    usuario: z.string().min(1),
    nome: z.string().min(1),
    hash: z.string().startsWith(PREFIXO_HASH, "gere o hash com npm run admin:senha"),
  }),
);

export type Usuario = z.infer<typeof usuariosSchema>[number];

/**
 * A lista é lida a cada pedido ao /admin (proxy, rota, página). Ela só é
 * interpretada de novo quando o texto da variável muda, o que mantém o "tirar da
 * lista + Redeploy" valendo na hora.
 */
let ultima: { bruto: string; usuarios: Usuario[] } | undefined;

function lerUsuarios(): Usuario[] {
  const bruto = process.env.ADMIN_USUARIOS;
  if (!bruto) throw new Error("Configure ADMIN_USUARIOS (veja o .env.example).");
  if (ultima?.bruto === bruto) return ultima.usuarios;
  ultima = { bruto, usuarios: interpretar(bruto) };
  return ultima.usuarios;
}

function interpretar(bruto: string): Usuario[] {
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

/**
 * A sessão do cookie, só se o professor ainda está em ADMIN_USUARIOS. Assim, tirar
 * alguém da lista (e fazer o Redeploy) corta o acesso na hora, sem esperar o cookie
 * vencer. O nome vem da lista, atualizado (é ele que vai nas mensagens de commit).
 */
export function sessaoValida(cookie: string | undefined): Sessao | null {
  const sessao = verificarSessao(cookie);
  if (!sessao) return null;
  try {
    const usuario = buscarUsuario(sessao.usuario);
    return usuario ? { ...sessao, nome: usuario.nome } : null;
  } catch (erro) {
    console.error(erro);
    return null;
  }
}
