import { NextResponse, type NextRequest } from "next/server";
import { origemValida } from "@/lib/admin/origem";
import { COOKIE_SESSAO } from "@/lib/admin/sessao";
import { sessaoValida } from "@/lib/admin/usuarios";

/** Rotas do admin abertas a quem ainda não entrou. */
const PUBLICAS = new Set(["/admin/login", "/api/admin/login", "/api/admin/sair"]);

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const api = pathname.startsWith("/api/");

  if (api && req.method !== "GET" && req.method !== "HEAD" && !origemValida(req.headers)) {
    return NextResponse.json({ erro: "Pedido recusado: origem inválida." }, { status: 403 });
  }

  // Cookie autêntico e professor ainda na lista ADMIN_USUARIOS.
  const sessao = sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value);

  let resposta: NextResponse;
  if (PUBLICAS.has(pathname)) {
    resposta = sessao && !api ? NextResponse.redirect(new URL("/admin", req.url)) : NextResponse.next();
  } else if (sessao) {
    resposta = NextResponse.next();
  } else if (api) {
    resposta = NextResponse.json({ erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });
  } else {
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("volta", pathname + search);
    resposta = NextResponse.redirect(login);
  }

  // Nada do admin aparece em buscadores.
  resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return resposta;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
