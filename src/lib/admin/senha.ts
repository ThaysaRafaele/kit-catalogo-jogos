/**
 * Hash de senha com scrypt (node:crypto), salt aleatório por senha.
 * Formato guardado em ADMIN_USUARIOS: "scrypt:N:r:p:salt:hash" (salt e hash em base64url).
 * O separador é ":" e não "$" porque o Next expande "$algo" no .env.local como variável.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const PREFIXO_HASH = "scrypt:";

const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 64;

function scrypt(senha: string, salt: Buffer, tamanho: number, opcoes: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(senha.normalize("NFC"), salt, tamanho, opcoes, (erro, chave) =>
      erro ? reject(erro) : resolve(chave),
    );
  });
}

export async function gerarHash(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(senha, salt, TAMANHO, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export async function verificarSenha(senha: string, guardado: string): Promise<boolean> {
  const partes = guardado.split(":");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, saltTexto, hashTexto] = partes;
  const esperado = Buffer.from(hashTexto, "base64url");
  if (esperado.length === 0) return false;
  try {
    const calculado = await scrypt(senha, Buffer.from(saltTexto, "base64url"), esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

/**
 * Hash de uma senha que ninguém tem, usado quando o usuário não existe: a resposta
 * demora o mesmo tanto e não revela quais usuários existem. Fica pronto já ao
 * carregar o módulo, para o primeiro pedido não pagar o custo de criá-lo.
 */
const hashFalso = gerarHash(randomBytes(32).toString("hex"));
export function hashParaUsuarioInexistente(): Promise<string> {
  return hashFalso;
}
