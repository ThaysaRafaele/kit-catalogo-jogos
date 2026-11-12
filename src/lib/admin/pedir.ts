/**
 * Pedido do navegador às rotas do admin. Sempre devolve { ok, status, corpo }, com
 * o `erro` em português no corpo, inclusive quando não há conexão (status 0).
 */
import type { ErroCampo } from "./formulario.ts";

/** O que toda rota do admin pode responder, mais o que cada uma devolve (`T`). */
type CorpoResposta<T> = { erro?: string; erros?: ErroCampo[]; commitUrl?: string } & Partial<T>;

export async function pedir<T extends object = object>(
  url: string,
  metodo: "POST" | "PUT" | "DELETE",
  corpo?: object | FormData,
): Promise<{ ok: boolean; status: number; corpo: CorpoResposta<T> }> {
  try {
    const resposta = await fetch(url, {
      method: metodo,
      // Com FormData, o navegador põe sozinho o Content-Type com o separador das partes.
      headers: corpo instanceof FormData || corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: corpo instanceof FormData ? corpo : corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const dados = (await resposta.json().catch(() => ({}))) as CorpoResposta<T>;
    return { ok: resposta.ok, status: resposta.status, corpo: dados };
  } catch {
    return { ok: false, status: 0, corpo: { erro: "Sem conexão com o servidor. Confira a internet e tente de novo: nada foi gravado." } as CorpoResposta<T> };
  }
}
