import { NextResponse } from "next/server";
import { ipDe, liberarTentativa, reservarTentativa } from "@/lib/admin/limite";
import { hashParaUsuarioInexistente, verificarSenha } from "@/lib/admin/senha";
import { origemValida, respostaErro } from "@/lib/admin/servidor";
import { assinarSessao, COOKIE_SESSAO, opcoesCookie } from "@/lib/admin/sessao";
import { buscarUsuario } from "@/lib/admin/usuarios";

export const runtime = "nodejs";

const NAO_CONFIGURADO = "O login do admin não está configurado no servidor.";

export async function POST(req: Request) {
  if (!origemValida(req.headers)) return respostaErro("Pedido recusado: origem inválida.", 403);

  const corpo = (await req.json().catch(() => null)) as { usuario?: unknown; senha?: unknown } | null;
  const usuario = typeof corpo?.usuario === "string" ? corpo.usuario : "";
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";
  if (!usuario || !senha) return respostaErro("Preencha o usuário e a senha.", 400);

  // A tentativa conta antes da conferência da senha, que é demorada de propósito.
  const ip = ipDe(req.headers);
  const agora = Date.now();
  const espera = reservarTentativa(ip, usuario, agora);
  if (espera > 0) {
    return respostaErro(
      `Muitas tentativas erradas. Tente de novo em ${espera} minuto${espera > 1 ? "s" : ""}.`,
      429,
    );
  }

  let encontrado;
  try {
    encontrado = buscarUsuario(usuario);
  } catch (erro) {
    console.error(erro);
    return respostaErro(NAO_CONFIGURADO, 500);
  }

  // Mesmo sem usuário, calcula um hash: a resposta demora igual nos dois casos.
  const confere = await verificarSenha(senha, encontrado?.hash ?? (await hashParaUsuarioInexistente()));
  if (!encontrado || !confere) return respostaErro("Usuário ou senha incorretos.", 401);

  let cookie: string;
  try {
    cookie = assinarSessao(encontrado.usuario, encontrado.nome);
  } catch (erro) {
    console.error(erro);
    return respostaErro(NAO_CONFIGURADO, 500);
  }

  liberarTentativa(ip, usuario, agora);
  const resposta = NextResponse.json({ ok: true, nome: encontrado.nome });
  resposta.cookies.set(COOKIE_SESSAO, cookie, opcoesCookie());
  return resposta;
}
