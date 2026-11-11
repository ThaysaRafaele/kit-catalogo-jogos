/**
 * Mensagem dos commits do admin, com o nome de quem salvou.
 * Ex.: "conteudo(2026): edita heaven-runner [por Thaysa]".
 */
export function mensagemCommit(escopo: string | number, acao: string, alvo: string, autor: string): string {
  return `conteudo(${escopo}): ${acao} ${alvo} [por ${autor}]`;
}
