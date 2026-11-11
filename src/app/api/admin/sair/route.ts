import { NextResponse } from "next/server";
import { origemValida, respostaErro } from "@/lib/admin/servidor";
import { COOKIE_SESSAO, opcoesCookie } from "@/lib/admin/sessao";

export const runtime = "nodejs";

/** Chamado por um <form method="post">: funciona mesmo sem JavaScript. */
export async function POST(req: Request) {
  if (!origemValida(req.headers)) return respostaErro("Pedido recusado: origem inválida.", 403);
  const resposta = NextResponse.redirect(new URL("/admin/login?saiu=1", req.url), 303);
  resposta.cookies.set(COOKIE_SESSAO, "", opcoesCookie(0));
  return resposta;
}
