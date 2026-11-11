/**
 * Limite de tentativas de login, em memória. Na Vercel cada instância tem a sua
 * contagem, o que basta para barrar quem tenta adivinhar senhas em sequência.
 *
 * Duas contagens, numa janela de 15 minutos:
 * - IP + usuário: no máximo 5 erros. Um aluno que erra a senha no laboratório
 *   bloqueia só aquele usuário naquele IP, e não todos os professores da escola,
 *   que saem pela mesma internet.
 * - Só o IP: no máximo 30 erros, para quem tenta vários usuários do mesmo lugar.
 *
 * Cada tentativa é reservada ANTES de conferir a senha (que demora). Assim,
 * pedidos em paralelo não passam todos pela conferência antes de algum contar.
 */
export const MAX_ERROS = 5;
export const MAX_ERROS_IP = 30;
export const JANELA_MS = 15 * 60 * 1000;

const erros = new Map<string, number[]>();

function recentes(chave: string, agora: number): number[] {
  return (erros.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
}

/** Tira as contagens vencidas de todo mundo, para o mapa não crescer sem fim. */
function faxina(agora: number) {
  for (const [chave, lista] of erros) {
    const vivas = lista.filter((t) => agora - t < JANELA_MS);
    if (vivas.length === 0) erros.delete(chave);
    else erros.set(chave, vivas);
  }
}

const chaves = (ip: string, usuario: string) => [`ip:${ip}`, `u:${ip}|${usuario.trim().toLowerCase()}`];

/**
 * Reserva uma tentativa. Devolve 0 se pode tentar, ou os minutos de espera se
 * passou do limite. Se a senha estiver certa, chame `liberarTentativa`.
 */
export function reservarTentativa(ip: string, usuario: string, agora = Date.now()): number {
  faxina(agora);
  const [chaveIp, chaveUsuario] = chaves(ip, usuario);
  const doIp = recentes(chaveIp, agora);
  const doUsuario = recentes(chaveUsuario, agora);
  const estourada = doUsuario.length >= MAX_ERROS ? doUsuario : doIp.length >= MAX_ERROS_IP ? doIp : null;
  if (estourada) return Math.max(1, Math.ceil((estourada[0] + JANELA_MS - agora) / 60000));
  erros.set(chaveIp, [...doIp, agora]);
  erros.set(chaveUsuario, [...doUsuario, agora]);
  return 0;
}

/** Login certo: apaga a reserva desta tentativa e os erros deste usuário neste IP. */
export function liberarTentativa(ip: string, usuario: string, agora: number) {
  const [chaveIp, chaveUsuario] = chaves(ip, usuario);
  erros.delete(chaveUsuario);
  const doIp = (erros.get(chaveIp) ?? []).filter((t) => t !== agora);
  if (doIp.length === 0) erros.delete(chaveIp);
  else erros.set(chaveIp, doIp);
}

/**
 * IP de quem chamou. Na Vercel o x-forwarded-for é reescrito pela própria
 * plataforma, então o primeiro valor é confiável. Fora dela, depende do proxy.
 */
export function ipDe(cabecalhos: Headers): string {
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "local";
}
