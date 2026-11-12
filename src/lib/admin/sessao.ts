/**
 * Sessão do admin: um cookie httpOnly com "dados.assinatura", em que os dados são
 * { usuario, nome, exp } em base64url e a assinatura é um HMAC-SHA256 com
 * ADMIN_SESSAO_SEGREDO. Sem banco: quem tem o segredo valida o cookie.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_SESSAO = "admin_sessao";
export const VALIDADE_SEGUNDOS = 8 * 60 * 60;

export type Sessao = { usuario: string; nome: string; exp: number };

function segredo(): string {
  const valor = process.env.ADMIN_SESSAO_SEGREDO;
  if (!valor || valor.length < 32) {
    throw new Error("Configure ADMIN_SESSAO_SEGREDO com pelo menos 32 caracteres.");
  }
  return valor;
}

function assinatura(dados: string): Buffer {
  return createHmac("sha256", segredo()).update(dados).digest();
}

export function assinarSessao(usuario: string, nome: string, agora = Date.now()): string {
  const sessao: Sessao = { usuario, nome, exp: Math.floor(agora / 1000) + VALIDADE_SEGUNDOS };
  const dados = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  return `${dados}.${assinatura(dados).toString("base64url")}`;
}

/**
 * Devolve a sessão se o cookie for autêntico e estiver no prazo; senão, null.
 * Sem o segredo configurado, ninguém fica logado (e o erro vai para o log), em
 * vez de todas as páginas do admin quebrarem com erro 500.
 */
export function verificarSessao(cookie: string | undefined, agora = Date.now()): Sessao | null {
  if (!cookie) return null;
  const [dados, assinado, ...resto] = cookie.split(".");
  if (!dados || !assinado || resto.length > 0) return null;
  let esperada: Buffer;
  try {
    esperada = assinatura(dados);
  } catch (erro) {
    console.error(erro);
    return null;
  }
  const recebida = Buffer.from(assinado, "base64url");
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null;
  try {
    const sessao = JSON.parse(Buffer.from(dados, "base64url").toString("utf8")) as Sessao;
    if (typeof sessao.usuario !== "string" || typeof sessao.nome !== "string") return null;
    if (typeof sessao.exp !== "number" || sessao.exp * 1000 <= agora) return null;
    return sessao;
  } catch {
    return null;
  }
}

/** Opções do cookie. Fora de produção (localhost em http) o "secure" fica desligado. */
export function opcoesCookie(maxAge = VALIDADE_SEGUNDOS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
