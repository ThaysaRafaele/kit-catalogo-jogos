/**
 * Nome em português de cada campo, como aparece na ficha dos alunos. Usado nas
 * pendências do painel e nas mensagens de erro do formulário.
 */
import type { Pendencia } from "../limpeza.ts";

export const ROTULOS: Record<string, string> = {
  // Jogo
  slug: "Endereço (slug)",
  turma: "Turma",
  estudio: "Estúdio",
  nome: "Nome do jogo",
  tema: "Tema",
  genero: "Gênero",
  plataforma: "Plataforma",
  frase: "Frase de efeito",
  sinopse: "Sinopse",
  "protagonista.nome": "Protagonista: nome",
  "protagonista.quemE": "Protagonista: quem é",
  "protagonista.habilidadeEspecial": "Protagonista: habilidade especial",
  "protagonista.desenho.src": "Protagonista: desenho",
  "protagonista.desenho.alt": "Protagonista: descrição do desenho (alt)",
  "antagonista.nome": "Antagonista: nome",
  "antagonista.motivacao": "Antagonista: motivação",
  "antagonista.relacaoProtagonista": "Antagonista: relação com o protagonista",
  "antagonista.desenho.src": "Antagonista: desenho",
  "antagonista.desenho.alt": "Antagonista: descrição do desenho (alt)",
  "mundo.lugar": "Mundo: lugar",
  "mundo.epoca": "Mundo: época",
  "mundo.caracteristicas": "Mundo: características visuais",
  "mundo.clima": "Mundo: clima",
  "mundo.inspiracao": "Mundo: inspiração real",
  "mundo.desenho.src": "Mundo: desenho",
  "mundo.desenho.alt": "Mundo: descrição do desenho (alt)",
  controles: "Como se joga: controles",
  "controles.acao": "Como se joga: ação",
  "controles.teclas": "Como se joga: teclas",
  desafio: "Bastidores: desafio",
  solucao: "Bastidores: solução",
  equipe: "Equipe",
  "equipe.nome": "Equipe: primeiro nome",
  "equipe.funcao": "Equipe: função",
  link: "Link para jogar",
  autorizacaoImagem: "Termo de autorização de imagem",
  // Edição
  ano: "Ano",
  titulo: "Título",
  textoAbertura: "Texto de abertura",
  agradecimento: "Agradecimento",
  turmas: "Turmas",
  "turmas.id": "Turma: nome",
  "turmas.lema": "Turma: lema",
  "turmas.mentor": "Turma: mentor",
  creditos: "Créditos",
  "creditos.funcao": "Créditos: função",
  "creditos.nome": "Créditos: nomes",
};

/**
 * ".equipe[Vitória].funcao" → "Equipe: função (Vitória)";
 * ".mundo.caracteristicas[0]" → "Mundo: características visuais".
 */
export function rotuloDoCampo(campo: string): string {
  const itens = [...campo.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]).filter((item) => !/^\d+$/.test(item));
  const chave = campo.replace(/\[[^\]]*\]/g, "").replace(/^\./, "");
  const rotulo = ROTULOS[chave] ?? chave;
  return itens.length > 0 ? `${rotulo} (${itens.join(", ")})` : rotulo;
}

export function descreverParaPainel({ campo, motivo }: Pendencia): string {
  const rotulo = rotuloDoCampo(campo);
  if (motivo === "imagem" || (motivo !== "lista" && campo.endsWith(".desenho.src"))) {
    return `${rotulo} não enviado`;
  }
  if (motivo === "lista") return `${rotulo} (nenhum item)`;
  return rotulo;
}
