/**
 * JSON gravado pelo admin, no mesmo estilo das fichas escritas à mão: 2 espaços,
 * quebra de linha no final e as chaves na ordem do esquema. Itens de lista simples
 * e curtos (uma linha de controle, uma pessoa da equipe) ficam numa linha só. Assim
 * o diff no GitHub mostra só o que mudou de verdade.
 */
import type { z } from "zod";
import { ehObjeto } from "./formularioJogo.ts";

type Def = {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  in?: z.ZodType;
  innerType?: z.ZodType;
};

/** Mesma largura de linha das fichas atuais. */
const LARGURA = 100;
const RECUO = "  ";

const definicao = (schema: z.ZodType) => (schema as unknown as { _zod: { def: Def } })._zod.def;

function ordenar(valor: unknown, schema: z.ZodType | undefined): unknown {
  if (!schema) return valor;
  const def = definicao(schema);
  switch (def.type) {
    case "pipe":
      return ordenar(valor, def.in);
    case "optional":
    case "nullable":
    case "default":
      return ordenar(valor, def.innerType);
    case "array":
      return Array.isArray(valor) ? valor.map((item) => ordenar(item, def.element)) : valor;
    case "object": {
      if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return valor;
      const objeto = valor as Record<string, unknown>;
      const forma = def.shape ?? {};
      const resultado: Record<string, unknown> = {};
      for (const chave of Object.keys(forma)) {
        if (objeto[chave] !== undefined) resultado[chave] = ordenar(objeto[chave], forma[chave]);
      }
      // Chave que o esquema não conhece vai no fim, sem se perder.
      for (const chave of Object.keys(objeto)) {
        if (!(chave in forma) && objeto[chave] !== undefined) resultado[chave] = objeto[chave];
      }
      return resultado;
    }
    default:
      return valor;
  }
}

const primitivo = (valor: unknown) => valor === null || typeof valor !== "object";

/** Objeto só com textos, números, booleanos ou listas deles: candidato a ficar numa linha. */
function simples(valor: Record<string, unknown>) {
  return Object.values(valor).every((v) => primitivo(v) || (Array.isArray(v) && v.every(primitivo)));
}

function emLinha(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(emLinha).join(", ")}]`;
  if (ehObjeto(valor)) {
    const partes = Object.entries(valor).map(([k, v]) => `${JSON.stringify(k)}: ${emLinha(v)}`);
    return partes.length > 0 ? `{ ${partes.join(", ")} }` : "{}";
  }
  return JSON.stringify(valor);
}

/**
 * `prefixo` é o que vem antes do valor na mesma linha (o recuo e a chave), para
 * saber se a versão em uma linha cabe na largura. Só item de lista (uma linha de
 * controle, uma pessoa, um crédito) vai numa linha: nas fichas escritas à mão,
 * objetos como o `desenho` sempre ocupam várias linhas.
 */
function escrever(valor: unknown, nivel: number, prefixo: string, itemDeLista = false): string {
  const recuo = RECUO.repeat(nivel);
  if (primitivo(valor)) return JSON.stringify(valor);

  if (itemDeLista && ehObjeto(valor) && simples(valor)) {
    const linha = emLinha(valor);
    if (prefixo.length + linha.length + 1 <= LARGURA) return linha;
  }

  const filho = RECUO.repeat(nivel + 1);
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "[]";
    const itens = valor.map((item) => `${filho}${escrever(item, nivel + 1, filho, true)}`);
    return `[\n${itens.join(",\n")}\n${recuo}]`;
  }
  const entradas = Object.entries(valor as Record<string, unknown>);
  if (entradas.length === 0) return "{}";
  const linhas = entradas.map(([chave, v]) => {
    const inicio = `${filho}${JSON.stringify(chave)}: `;
    return `${inicio}${escrever(v, nivel + 1, inicio)}`;
  });
  return `{\n${linhas.join(",\n")}\n${recuo}}`;
}

export function formatarJson(dados: unknown, schema: z.ZodType): string {
  return `${escrever(ordenar(dados, schema), 0, "")}\n`;
}
