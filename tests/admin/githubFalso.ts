/**
 * Um GitHub de mentira, em memória, que responde às rotas da API usadas pelo
 * repositorio.ts (Contents e Git Data). Guarda arquivos, blobs, árvores, commits e
 * o branch, para os testes conferirem o resultado, e não só as chamadas.
 */
import { shaDoGit } from "../../src/lib/admin/repositorio.ts";

type Entrada = { path: string; sha: string | null };

export const TOKEN = "token-de-teste";

export function criarGithubFalso(inicial: Record<string, string | Buffer>) {
  const arquivos = new Map<string, Buffer>();
  const blobs = new Map<string, Buffer>();
  const commits = new Map<string, { pai: string; arvore: string }>([["c0", { pai: "", arvore: "t0" }]]);
  const arvores = new Map<string, Entrada[]>();
  const chamadas: string[] = [];
  const ganchos: { padrao: string; acao: () => void }[] = [];
  let head = "c0";
  let contador = 0;

  const guardar = (caminho: string, conteudo: string | Buffer) => {
    const dados = typeof conteudo === "string" ? Buffer.from(conteudo) : conteudo;
    arquivos.set(caminho, dados);
    blobs.set(shaDoGit(dados), dados);
  };
  for (const [caminho, conteudo] of Object.entries(inicial)) guardar(caminho, conteudo);

  const resposta = (status: number, corpo: unknown) =>
    new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

  async function fetchFalso(url: string | URL | Request, init: RequestInit = {}): Promise<Response> {
    const endereco = new URL(String(url));
    const metodo = init.method ?? "GET";
    const rota = endereco.pathname.replace(/^\/repos\/dono\/repo/, "");
    const chamada = `${metodo} ${rota}`;
    chamadas.push(chamada);
    for (const gancho of ganchos.splice(0)) {
      if (chamada.startsWith(gancho.padrao)) gancho.acao();
      else ganchos.push(gancho);
    }

    const cabecalhos = new Headers(init.headers);
    if (cabecalhos.get("authorization") !== `Bearer ${TOKEN}`) return resposta(401, { message: "Bad credentials" });
    const corpo = init.body ? JSON.parse(String(init.body)) : null;

    if (metodo === "GET" && rota === "/git/ref/heads/main") return resposta(200, { object: { sha: head } });
    if (metodo === "GET" && rota.startsWith("/git/commits/")) return resposta(200, { tree: { sha: `t-${rota.slice(13)}` } });

    if (metodo === "GET" && rota.startsWith("/contents/")) {
      const caminho = rota.slice(10).split("/").map(decodeURIComponent).join("/");
      const dados = arquivos.get(caminho);
      if (dados) {
        return resposta(200, { type: "file", path: caminho, sha: shaDoGit(dados), content: dados.toString("base64"), encoding: "base64" });
      }
      const filhos = new Set(
        [...arquivos.keys()]
          .filter((p) => p.startsWith(`${caminho}/`))
          .map((p) => `${caminho}/${p.slice(caminho.length + 1).split("/")[0]}`),
      );
      if (filhos.size === 0) return resposta(404, { message: "Not Found" });
      return resposta(200, [...filhos].map((p) => ({ type: arquivos.has(p) ? "file" : "dir", path: p, sha: "x" })));
    }

    if (metodo === "GET" && rota === "/git/trees/main") {
      return resposta(200, { truncated: false, tree: [...arquivos.keys()].map((path) => ({ path, type: "blob" })) });
    }

    if (metodo === "POST" && rota === "/git/blobs") {
      const dados = Buffer.from(corpo.content, "base64");
      const sha = shaDoGit(dados);
      blobs.set(sha, dados);
      return resposta(201, { sha });
    }
    if (metodo === "POST" && rota === "/git/trees") {
      const id = `t${++contador}`;
      arvores.set(id, corpo.tree);
      return resposta(201, { sha: id });
    }
    if (metodo === "POST" && rota === "/git/commits") {
      const id = `c${++contador}`;
      commits.set(id, { pai: corpo.parents[0], arvore: corpo.tree });
      return resposta(201, { sha: id, html_url: `https://github.com/dono/repo/commit/${id}` });
    }

    if (metodo === "PATCH" && rota === "/git/refs/heads/main") {
      const commit = commits.get(corpo.sha);
      if (!commit) return resposta(422, { message: "Object does not exist" });
      if (commit.pai !== head) return resposta(422, { message: "Update is not a fast forward" });
      const caminhos = (arvores.get(commit.arvore) ?? []).map((e) => e.path);
      if (new Set(caminhos).size !== caminhos.length) return resposta(422, { message: "Caminho repetido na árvore" });
      for (const { path, sha } of arvores.get(commit.arvore) ?? []) {
        if (sha === null) {
          if (!arquivos.has(path)) return resposta(422, { message: `Apagar caminho que não existe: ${path}` });
          arquivos.delete(path);
        } else {
          arquivos.set(path, blobs.get(sha)!);
        }
      }
      head = corpo.sha;
      return resposta(200, { object: { sha: head } });
    }

    return resposta(500, { message: `Rota não simulada: ${chamada}` });
  }

  return {
    fetch: fetchFalso,
    arquivos,
    chamadas,
    texto: (caminho: string) => arquivos.get(caminho)?.toString("utf8"),
    /** Quantos commits entraram no branch desde o início. */
    commits: () => {
      let n = 0;
      for (let c = head; c !== "c0"; c = commits.get(c)!.pai) n++;
      return n;
    },
    /** Executa `acao` (ex.: "outra pessoa salvou") logo antes da primeira chamada que começa com `padrao`. */
    antesDe(padrao: string, acao: () => void) {
      ganchos.push({ padrao, acao });
    },
    /** Outra pessoa grava direto no branch (um commit que o teste não fez). */
    salvarPorFora(caminho: string, conteudo: string) {
      guardar(caminho, conteudo);
      const id = `c${++contador}`;
      commits.set(id, { pai: head, arvore: "fora" });
      head = id;
    },
  };
}
