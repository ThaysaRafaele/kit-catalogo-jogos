/**
 * JSON gravado pelo admin: 2 espaços, quebra de linha no final e as chaves na mesma
 * ordem do esquema. Assim o diff no GitHub mostra só o que mudou de verdade.
 */
import type { z } from "zod";

type Def = {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  in?: z.ZodType;
  innerType?: z.ZodType;
};

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

export function formatarJson(dados: unknown, schema: z.ZodType): string {
  return `${JSON.stringify(ordenar(dados, schema), null, 2)}\n`;
}
