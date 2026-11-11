/**
 * Classes do admin. Mesmas cores e fontes do catálogo, mas pensadas para trabalho:
 * texto grande, contorno forte nos campos e mensagens de erro bem visíveis.
 */
export const estilos = {
  campo:
    "w-full rounded-lg border-2 border-tinta bg-papel-claro px-3 py-2 text-lg text-tinta aria-invalid:border-erro aria-invalid:bg-erro-fundo",
  rotulo: "font-bold text-tinta",
  ajuda: "text-base text-suave",
  erroCampo: "font-bold text-erro",
  cartao: "rounded-xl border-[3px] border-tinta bg-papel p-5 shadow-bloco sm:p-7",
  titulo: "font-press text-xl leading-snug text-vinho",
  subtitulo: "font-press text-base leading-snug text-vinho",
  caixaErro: "rounded-lg border-2 border-erro bg-erro-fundo p-4 text-tinta",
  caixaOk: "rounded-lg border-2 border-floresta bg-[#e7f5df] p-4 text-tinta",
};
