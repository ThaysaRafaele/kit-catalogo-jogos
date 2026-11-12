/**
 * Proteção CSRF: pedidos que mudam algo precisam vir de uma página deste mesmo site.
 * O navegador sempre manda o Origin em POST/PUT/DELETE, e outro site não consegue forjá-lo.
 */
export function origemValida(cabecalhos: Headers): boolean {
  const origem = cabecalhos.get("origin");
  // Com mais de um proxy no caminho, o x-forwarded-host vira uma lista: vale o primeiro.
  const host = (cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host"))?.split(",")[0]?.trim();
  if (!origem || !host) return false;
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}

/** Destino depois do login: só caminhos internos do admin (evita redirecionar para fora). */
export function destinoSeguro(volta: string | null | undefined): string {
  if (!volta || !volta.startsWith("/admin") || volta.startsWith("//") || volta.includes("\\")) return "/admin";
  return volta.startsWith("/admin/login") ? "/admin" : volta;
}
