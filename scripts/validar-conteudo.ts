import { carregarConteudo } from "../src/lib/conteudo.ts";

try {
  const { edicoes, mentores, avisos } = carregarConteudo();
  const jogos = edicoes.reduce((soma, e) => soma + e.jogos.length, 0);
  console.log(
    `Conteúdo válido: ${edicoes.length} edição(ões), ${jogos} jogo(s), ${mentores.length} mentores.`,
  );
  if (avisos.length > 0) {
    console.warn(`\n${avisos.length} aviso(s), não exibidos no site:`);
    for (const aviso of avisos) console.warn(`  - ${aviso}`);
  }
} catch (erro) {
  console.error((erro as Error).message);
  process.exit(1);
}
