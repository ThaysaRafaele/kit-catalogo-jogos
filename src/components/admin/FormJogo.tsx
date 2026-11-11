"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CARACTERISTICAS,
  gerarSlug,
  linhaControle,
  linhaEquipe,
  srcDesenho,
  NOMES_DESENHO,
  sugerirAlt,
  TIPOS_DESENHO,
  type EntradaJogo,
  type TipoDesenho,
} from "@/lib/admin/formularioJogo";
import {
  ACEITAR,
  ENVELOPE_POR_PARTE,
  LIMITE_POR_REQUISICAO,
  prepararImagem,
  tamanhoLegivel,
  type ImagemPreparada,
} from "@/lib/admin/imagemNavegador";
import { idDoCampo, validarJogo, type ErroCampo } from "@/lib/admin/validacaoJogo";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";
import { ancoraDoJogo, contar } from "@/lib/formato";
import { TEMAS } from "@/lib/temas";
import { Campo } from "./Campo";
import { estilos } from "./estilos";

type Props = {
  ano: string;
  turmas: string[];
  /** Slugs de todos os jogos da edição, para conferir se o endereço está livre. */
  slugsDaEdicao: string[];
  /** srcs dos desenhos já enviados ("/edicoes/2026/slug/mundo.webp"). */
  imagens: string[];
  inicial: EntradaJogo;
  /** Sha da ficha gravada; null para jogo novo. */
  sha: string | null;
  /** Slug com que o jogo está gravado; null para jogo novo. */
  slugOriginal: string | null;
};

type Caminho = (string | number)[];

type Resultado =
  | {
      tipo: "ok";
      slug: string;
      /** Links dos commits (vazio no modo local). Mais de um quando os desenhos foram separados. */
      commits: string[];
      /** Desenhos que não chegaram, quando foram enviados um por um. */
      falhas: string[];
    }
  | { tipo: "erro"; texto: string; conflito: boolean };

/** Desenho escolhido nesta visita, já reduzido e convertido, esperando o "Publicar". */
type DesenhoNovo = ImagemPreparada & { arquivo: File; url: string; clarear: boolean };

type Rascunho = { salvoEm: string; entrada: EntradaJogo };

const botao = (variante: "primary" | "secondary" | "ghost") => `${BASE_BOTAO} ${estiloBotao(variante)}`;

function ler(objeto: unknown, caminho: Caminho): unknown {
  return caminho.reduce<unknown>((atual, chave) => (atual as Record<string | number, unknown>)?.[chave], objeto);
}

/** Cópia do objeto com um valor trocado no caminho (sem mexer no original). */
function definir<T>(objeto: T, caminho: Caminho, valor: unknown): T {
  if (caminho.length === 0) return valor as T;
  const [chave, ...resto] = caminho;
  const copia = (Array.isArray(objeto) ? [...objeto] : { ...objeto }) as Record<string | number, unknown>;
  copia[chave] = definir(copia[chave], resto, valor);
  return copia as T;
}

function juntarErros(...listas: ErroCampo[][]): ErroCampo[] {
  const vistos = new Set<string>();
  return listas.flat().filter((erro) => !vistos.has(erro.id) && vistos.add(erro.id));
}

function lerRascunho(chave: string): Rascunho | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Rascunho) : null;
  } catch {
    return null;
  }
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className={`${estilos.cartao} flex flex-col gap-5`}>
      <legend className="float-left mb-1 w-full font-press text-base leading-snug text-vinho">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function FormJogo(props: Props) {
  const { ano, turmas, inicial } = props;
  const [entrada, setEntrada] = useState(inicial);
  // Acompanha a troca de slug: os desenhos movidos continuam aparecendo como enviados.
  const [imagens, setImagens] = useState(props.imagens);
  const [sha, setSha] = useState(props.sha);
  const [slugOriginal, setSlugOriginal] = useState(props.slugOriginal);
  const [slugsDaEdicao, setSlugsDaEdicao] = useState(props.slugsDaEdicao);
  // Jogo já publicado: o slug não acompanha mais o nome sozinho.
  const [slugManual, setSlugManual] = useState(props.slugOriginal !== null);
  const [tentouPublicar, setTentouPublicar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errosServidor, setErrosServidor] = useState<ErroCampo[]>([]);
  const [status, setStatus] = useState("");
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [focar, setFocar] = useState<string | null>(null);
  const [desenhosNovos, setDesenhosNovos] = useState<Partial<Record<TipoDesenho, DesenhoNovo>>>({});
  const [errosDesenho, setErrosDesenho] = useState<Partial<Record<TipoDesenho, string>>>({});
  /** Prévia local dos desenhos já publicados nesta visita (o site só os mostra depois do deploy). */
  const [previasPublicadas, setPreviasPublicadas] = useState<Partial<Record<TipoDesenho, string>>>({});
  /** Desenho sendo reduzido agora: os botões dele ficam travados até terminar. */
  const [preparando, setPreparando] = useState<Partial<Record<TipoDesenho, boolean>>>({});
  /** Conta as preparações de cada desenho: só vale o resultado da mais recente. */
  const ultimaPreparacao = useRef<Partial<Record<TipoDesenho, number>>>({});
  /** Toda URL de prévia criada, para liberar a memória ao sair da página. */
  const urlsCriadas = useRef(new Set<string>());

  useEffect(() => {
    const urls = urlsCriadas.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function liberarUrl(url: string | undefined) {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsCriadas.current.delete(url);
  }

  const gravado = useRef(JSON.stringify(inicial));
  const resumo = useRef<HTMLDivElement>(null);
  const caixaResultado = useRef<HTMLDivElement>(null);
  // Segue o endereço atual do jogo: depois de publicar um jogo novo (ou trocar o slug),
  // o rascunho passa a ser o do jogo publicado, e não o de "Novo jogo".
  const chaveDe = (slug: string | null) => `admin-rascunho:${ano}:${slug ?? "novo"}`;
  const chaveRascunho = chaveDe(slugOriginal);

  const slugsOcupados = useMemo(
    () => slugsDaEdicao.filter((s) => s !== slugOriginal),
    [slugsDaEdicao, slugOriginal],
  );
  const errosLocais = useMemo(
    () => validarJogo(entrada, { ano, turmas, slugsOcupados }).erros,
    [entrada, ano, turmas, slugsOcupados],
  );
  // Os erros aparecem depois da primeira tentativa de publicar e somem conforme a pessoa corrige.
  const erros = tentouPublicar ? juntarErros(errosLocais, errosServidor) : [];
  const erroDe = (caminho: Caminho) => erros.find((e) => e.id === idDoCampo(caminho))?.mensagem;
  const alterado = JSON.stringify(entrada) !== gravado.current || Object.keys(desenhosNovos).length > 0;

  // Rascunho guardado neste navegador: oferece recuperar.
  useEffect(() => {
    const salvo = lerRascunho(chaveRascunho);
    if (salvo && JSON.stringify(salvo.entrada) !== gravado.current) setRascunho(salvo);
  }, [chaveRascunho]);

  // Avisa antes de sair da página com alterações não publicadas.
  useEffect(() => {
    if (!alterado) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  // Foco na linha nova das listas, depois que ela aparece na tela.
  useEffect(() => {
    if (!focar) return;
    document.getElementById(focar)?.focus();
    setFocar(null);
  }, [focar]);

  function mudar(caminho: Caminho, valor: unknown) {
    setEntrada((atual) => definir(atual, caminho, valor));
    setErrosServidor([]);
  }

  function mudarNome(valor: string) {
    setEntrada((atual) => {
      const novo = definir(atual, ["nome"], valor);
      return slugManual ? novo : { ...novo, slug: gerarSlug(valor) };
    });
    setErrosServidor([]);
  }

  /** Campo de texto ligado a um caminho da ficha. */
  function texto(caminho: Caminho, rotulo: string, opcoes: Partial<Parameters<typeof Campo>[0]> = {}) {
    return (
      <Campo
        key={idDoCampo(caminho)}
        id={idDoCampo(caminho)}
        rotulo={rotulo}
        valor={String(ler(entrada, caminho) ?? "")}
        aoMudar={(valor) => mudar(caminho, valor)}
        erro={erroDe(caminho)}
        {...opcoes}
      />
    );
  }

  function focarNoResumo() {
    requestAnimationFrame(() => resumo.current?.focus());
  }

  function salvarRascunho() {
    try {
      const novo: Rascunho = { salvoEm: new Date().toISOString(), entrada };
      window.localStorage.setItem(chaveRascunho, JSON.stringify(novo));
      const hora = new Date().toLocaleTimeString("pt-BR", { timeStyle: "short" });
      setStatus(
        `Rascunho salvo neste navegador às ${hora}.` +
          (Object.keys(desenhosNovos).length > 0
            ? " O rascunho guarda só os textos: se recarregar a página, escolha os desenhos de novo."
            : ""),
      );
    } catch {
      setStatus("Não foi possível salvar o rascunho neste navegador (o armazenamento pode estar bloqueado).");
    }
  }

  function apagarRascunho(...chaves: string[]) {
    try {
      for (const chave of chaves.length > 0 ? chaves : [chaveRascunho]) window.localStorage.removeItem(chave);
    } catch {
      // Sem armazenamento, não há rascunho para apagar.
    }
  }

  function recuperarRascunho() {
    if (!rascunho) return;
    setEntrada(rascunho.entrada);
    setSlugManual(true);
    setRascunho(null);
    setStatus("Rascunho recuperado. Confira os campos e publique quando estiver pronto.");
  }

  function descartarRascunho() {
    apagarRascunho();
    setRascunho(null);
    setStatus("Rascunho descartado.");
  }

  async function publicar() {
    setTentouPublicar(true);
    setResultado(null);
    if (errosLocais.length > 0) {
      focarNoResumo();
      return;
    }

    const novos = TIPOS_DESENHO.filter((tipo) => desenhosNovos[tipo]);
    // Jogo já publicado e ficha igual à gravada: só os desenhos (se houver) precisam ir.
    const fichaMudou = slugOriginal === null || JSON.stringify(entrada) !== gravado.current;
    if (!fichaMudou && novos.length === 0) {
      setStatus("Nada mudou desde a última publicação.");
      return;
    }

    setEnviando(true);
    setStatus("Publicando...");
    const mostrarErro = (texto: string, conflito = false) => {
      setResultado({ tipo: "erro", texto, conflito });
      setStatus("");
      requestAnimationFrame(() => caixaResultado.current?.focus());
    };

    let slugFinal = slugOriginal;
    const commits: string[] = [];
    const enviados: TipoDesenho[] = [];
    const falhas: string[] = [];

    try {
      if (fichaMudou) {
        // Ficha e desenhos num commit só, se couberem numa requisição (medida em bytes,
        // com o envelope de cada parte). Se não, a ficha vai sozinha e os desenhos depois.
        const dados = JSON.stringify({ entrada, sha });
        const tamanho =
          new Blob([dados]).size +
          ENVELOPE_POR_PARTE +
          novos.reduce((soma, tipo) => soma + desenhosNovos[tipo]!.blob.size + ENVELOPE_POR_PARTE, 0);
        const juntos = novos.length > 0 && tamanho <= LIMITE_POR_REQUISICAO;
        let corpoEnvio: BodyInit = dados;
        if (juntos) {
          const form = new FormData();
          form.append("dados", dados);
          for (const tipo of novos) form.append(`desenho-${tipo}`, desenhosNovos[tipo]!.blob, `${tipo}.webp`);
          corpoEnvio = form;
        }

        const url = slugOriginal ? `/api/admin/edicoes/${ano}/jogos/${slugOriginal}` : `/api/admin/edicoes/${ano}/jogos`;
        const resposta = await fetch(url, {
          method: slugOriginal ? "PUT" : "POST",
          // Com FormData, o navegador põe sozinho o Content-Type com o separador das partes.
          headers: juntos ? undefined : { "Content-Type": "application/json" },
          body: corpoEnvio,
        });
        const corpo = (await resposta.json().catch(() => ({}))) as {
          erro?: string;
          erros?: ErroCampo[];
          slug?: string;
          sha?: string;
          commitUrl?: string;
        };

        if (!resposta.ok || !corpo.slug || !corpo.sha) {
          if (resposta.status === 422 && corpo.erros && corpo.erros.length > 0) {
            setErrosServidor(corpo.erros);
            setStatus("");
            focarNoResumo();
          } else {
            mostrarErro(corpo.erro ?? "Não foi possível publicar. Tente de novo.", resposta.status === 409);
          }
          setEnviando(false);
          return;
        }

        const novoSlug = corpo.slug;
        slugFinal = novoSlug;
        if (corpo.commitUrl) commits.push(corpo.commitUrl);
        if (juntos) enviados.push(...novos);

        // Desenhos já gravados que mudaram de pasta com o slug.
        if (slugOriginal && slugOriginal !== novoSlug) {
          const antes = `/edicoes/${ano}/${slugOriginal}/`;
          const depois = `/edicoes/${ano}/${novoSlug}/`;
          setImagens((atuais) => atuais.map((src) => (src.startsWith(antes) ? depois + src.slice(antes.length) : src)));
        }
        setSlugsDaEdicao((atuais) => [...atuais.filter((s) => s !== slugOriginal && s !== novoSlug), novoSlug]);
        setSha(corpo.sha);
        setSlugOriginal(novoSlug);
        setSlugManual(true);
        gravado.current = JSON.stringify(entrada);
        // O rascunho do endereço antigo (ou de "Novo jogo") e o do novo: os dois ficaram velhos.
        apagarRascunho(chaveDe(slugOriginal), chaveDe(novoSlug));
        // O endereço passa a ser o da edição do jogo, sem recarregar a página.
        window.history.replaceState(null, "", `/admin/${ano}/jogo/${novoSlug}`);
      }

      // Desenhos que não foram junto com a ficha: um por requisição (e um commit cada).
      const restantes = novos.filter((tipo) => !enviados.includes(tipo));
      for (const [i, tipo] of restantes.entries()) {
        setStatus(`${fichaMudou ? "Ficha publicada. " : ""}Enviando desenho ${i + 1} de ${restantes.length}...`);
        const form = new FormData();
        form.append("arquivo", desenhosNovos[tipo]!.blob, `${tipo}.webp`);
        try {
          const r = await fetch(`/api/admin/edicoes/${ano}/jogos/${slugFinal}/desenhos/${tipo}`, {
            method: "PUT",
            body: form,
          });
          const c = (await r.json().catch(() => ({}))) as { erro?: string; commitUrl?: string };
          if (r.ok) {
            enviados.push(tipo);
            if (c.commitUrl) commits.push(c.commitUrl);
          } else {
            falhas.push(`${NOMES_DESENHO[tipo]}: ${c.erro ?? "não foi enviado"}`);
          }
        } catch {
          falhas.push(`${NOMES_DESENHO[tipo]}: sem conexão com o servidor`);
        }
      }
    } catch {
      mostrarErro("Sem conexão com o servidor. Nada foi publicado.");
      setEnviando(false);
      return;
    }

    if (fichaMudou || enviados.length > 0) {
      // Os enviados passam a contar como "já enviados"; os que falharam ficam para tentar de novo.
      const slug = slugFinal!;
      setImagens((atuais) => [...new Set([...atuais, ...enviados.map((tipo) => srcDesenho(ano, slug, tipo))])]);
      setPreviasPublicadas((atuais) => {
        for (const tipo of enviados) liberarUrl(atuais[tipo]);
        return { ...atuais, ...Object.fromEntries(enviados.map((tipo) => [tipo, desenhosNovos[tipo]!.url])) };
      });
      setDesenhosNovos((atuais) =>
        Object.fromEntries(Object.entries(atuais).filter(([tipo]) => !enviados.includes(tipo as TipoDesenho))),
      );
      setResultado({ tipo: "ok", slug, commits, falhas });
      setStatus("");
      requestAnimationFrame(() => caixaResultado.current?.focus());
    } else {
      // Ficha igual e nenhum desenho chegou: nada foi publicado.
      mostrarErro(`Nenhum desenho foi enviado. ${falhas.join(" ")}`);
    }
    setEnviando(false);
  }

  // ─── Listas dinâmicas (controles e equipe) ───────────────────────────────────

  function adicionarLinha(lista: "controles" | "equipe") {
    const atual = entrada[lista];
    const nova = lista === "controles" ? linhaControle() : linhaEquipe();
    mudar([lista], [...atual, nova]);
    setFocar(idDoCampo([lista, atual.length, lista === "controles" ? "acao" : "nome"]));
    setStatus(`Linha ${atual.length + 1} adicionada.`);
  }

  function removerLinha(lista: "controles" | "equipe", indice: number) {
    mudar(
      [lista],
      (entrada[lista] as unknown[]).filter((_, i) => i !== indice),
    );
    setFocar(`adicionar-${lista}`);
    setStatus(`Linha ${indice + 1} removida.`);
  }

  // ─── Desenhos ────────────────────────────────────────────────────────────────

  async function prepararDesenho(tipo: TipoDesenho, arquivo: File, clarear: boolean) {
    // Se a pessoa escolher outro arquivo antes desta terminar, só a escolha mais nova vale.
    const vez = (ultimaPreparacao.current[tipo] ?? 0) + 1;
    ultimaPreparacao.current[tipo] = vez;
    const atual = () => ultimaPreparacao.current[tipo] === vez;

    setPreparando((p) => ({ ...p, [tipo]: true }));
    setStatus("Preparando o desenho...");
    setErrosDesenho((atuais) => ({ ...atuais, [tipo]: undefined }));
    try {
      const preparada = await prepararImagem(arquivo, clarear);
      if (!atual()) return;
      const url = URL.createObjectURL(preparada.blob);
      urlsCriadas.current.add(url);
      setDesenhosNovos((atuais) => {
        liberarUrl(atuais[tipo]?.url);
        return { ...atuais, [tipo]: { ...preparada, arquivo, url, clarear } };
      });
      setStatus(
        `${NOMES_DESENHO[tipo]} pronto: ${preparada.largura} × ${preparada.altura} pixels, ` +
          `${tamanhoLegivel(preparada.blob.size)}${clarear ? ", com o fundo clareado" : ""}. Ele é enviado ao publicar.`,
      );
    } catch (erro) {
      if (!atual()) return;
      const mensagem = (erro as Error).message;
      setErrosDesenho((atuais) => ({ ...atuais, [tipo]: mensagem }));
      setStatus(mensagem);
    } finally {
      if (atual()) setPreparando((p) => ({ ...p, [tipo]: false }));
    }
  }

  function desfazerDesenho(tipo: TipoDesenho) {
    // Uma preparação em andamento não pode trazer o desenho de volta depois.
    ultimaPreparacao.current[tipo] = (ultimaPreparacao.current[tipo] ?? 0) + 1;
    setPreparando((p) => ({ ...p, [tipo]: false }));
    liberarUrl(desenhosNovos[tipo]?.url);
    setDesenhosNovos((atuais) => Object.fromEntries(Object.entries(atuais).filter(([t]) => t !== tipo)));
    const campo = document.getElementById(`desenho-${tipo}-arquivo`) as HTMLInputElement | null;
    if (campo) campo.value = "";
    setStatus(`Troca do ${NOMES_DESENHO[tipo].toLowerCase()} desfeita.`);
  }

  function blocoDesenho(tipo: TipoDesenho) {
    const caminhoAlt = [tipo, "desenho", "alt"];
    const src = srcDesenho(ano, slugOriginal ?? (entrada.slug || "novo"), tipo);
    const enviado = slugOriginal !== null && imagens.includes(src);
    const alt = entrada[tipo].desenho.alt;
    const novo = desenhosNovos[tipo];
    const previa = novo?.url ?? previasPublicadas[tipo] ?? (enviado ? src : null);
    const idArquivo = `desenho-${tipo}-arquivo`;
    const erroArquivo = errosDesenho[tipo];
    // Enquanto este desenho é preparado (ou a ficha é enviada), nada nele muda.
    const ocupado = Boolean(preparando[tipo]) || enviando;

    function sugerir() {
      const sugestao = sugerirAlt(entrada, tipo);
      if (!sugestao) {
        setStatus(
          tipo === "mundo"
            ? "Preencha o lugar e as características visuais para gerar uma sugestão."
            : "Preencha o nome e a descrição do personagem para gerar uma sugestão.",
        );
        return;
      }
      mudar(caminhoAlt, sugestao);
      setStatus(`Descrição sugerida: ${sugestao} Revise o texto antes de publicar.`);
    }

    return (
      <fieldset className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-tracejado p-4">
        <legend className="px-1 font-bold text-tinta">{NOMES_DESENHO[tipo]}</legend>
        {previa ? (
          <figure className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob) ou imagem do próprio catálogo */}
            <img
              src={previa}
              alt={alt.trim() || "Desenho ainda sem descrição"}
              className="max-h-60 w-fit max-w-full rounded-lg border-2 border-tinta bg-papel-claro"
            />
            <figcaption className={estilos.ajuda}>
              {novo
                ? `Desenho novo, ainda não publicado (${novo.largura} × ${novo.altura} pixels, ${tamanhoLegivel(novo.blob.size)}).`
                : previasPublicadas[tipo]
                  ? "Desenho publicado."
                  : "Desenho já enviado."}
            </figcaption>
          </figure>
        ) : (
          <p className={estilos.ajuda}>Ainda sem desenho enviado. No catálogo aparece um quadro vazio no lugar.</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={idArquivo} className={estilos.rotulo}>
            {previa ? "Trocar o desenho" : "Escolher o desenho"} (JPG, PNG ou WebP)
          </label>
          <p id={`${idArquivo}-ajuda`} className={estilos.ajuda}>
            Foto ou scan da ficha. A imagem é reduzida e convertida aqui no navegador antes do envio.
          </p>
          <input
            id={idArquivo}
            type="file"
            accept={ACEITAR}
            aria-invalid={erroArquivo ? true : undefined}
            aria-describedby={[erroArquivo ? `${idArquivo}-erro` : "", `${idArquivo}-ajuda`].filter(Boolean).join(" ")}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) prepararDesenho(tipo, arquivo, novo?.clarear ?? false);
            }}
            className="w-full rounded-lg border-2 border-tinta bg-papel-claro p-2 text-base file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-tinta file:bg-papel file:px-3 file:py-1.5 file:font-bold"
          />
          {erroArquivo && (
            <p id={`${idArquivo}-erro`} className={estilos.erroCampo}>
              {erroArquivo}
            </p>
          )}
        </div>

        {novo && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              aria-pressed={novo.clarear}
              // aria-disabled (e não disabled): o botão segue com o foco enquanto a imagem é refeita.
              aria-disabled={ocupado || undefined}
              onClick={() => {
                if (!ocupado) prepararDesenho(tipo, novo.arquivo, !novo.clarear);
              }}
              className={`${BASE_BOTAO} ${estiloBotao("toggle", novo.clarear)}`}
            >
              <span aria-hidden="true">{novo.clarear ? "■" : "□"}</span>
              Clarear fundo do papel
            </button>
            <button type="button" onClick={() => desfazerDesenho(tipo)} disabled={enviando} className={botao("ghost")}>
              Desfazer a troca
            </button>
          </div>
        )}
        {texto(caminhoAlt, "Descrição do desenho (texto alternativo)", {
          linhas: 2,
          ajuda: "Obrigatória. Diga o que aparece no desenho, em uma ou duas frases.",
          acao: (
            <button type="button" onClick={sugerir} className={`${botao("ghost")} self-start`}>
              Sugerir descrição a partir da ficha
            </button>
          ),
        })}
      </fieldset>
    );
  }

  // ─── Tela ────────────────────────────────────────────────────────────────────

  const trocandoSlug = slugOriginal !== null && entrada.slug.trim() !== slugOriginal;
  // Sem publicar enquanto algum desenho ainda está sendo reduzido: ele ficaria de fora.
  const desabilitar = enviando || Object.values(preparando).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {rascunho && (
        <div className={`${estilos.caixaOk} flex flex-col gap-3`}>
          <p>
            Há um rascunho deste jogo salvo neste navegador em{" "}
            {new Date(rascunho.salvoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={recuperarRascunho} className={botao("secondary")}>
              Recuperar rascunho
            </button>
            <button type="button" onClick={descartarRascunho} className={botao("ghost")}>
              Descartar rascunho
            </button>
          </div>
        </div>
      )}

      <div ref={caixaResultado} tabIndex={-1} className={resultado ? "" : "sr-only"}>
        {resultado?.tipo === "ok" && (
          <div className={`${estilos.caixaOk} flex flex-col gap-2`}>
            <p className="font-bold">
              {resultado.commits.length > 0
                ? "Publicado! O catálogo atualiza em cerca de 2 minutos."
                : "Salvo no modo local: os arquivos do projeto foram atualizados, sem commit."}
            </p>
            {resultado.falhas.length > 0 && (
              <div className={estilos.caixaErro}>
                <p className="font-bold">A ficha foi publicada, mas faltou enviar:</p>
                <ul className="list-disc pl-6">
                  {resultado.falhas.map((falha) => (
                    <li key={falha}>{falha}</li>
                  ))}
                </ul>
                <p>Os desenhos que faltaram continuam escolhidos: clique em Publicar de novo para tentar.</p>
              </div>
            )}
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {resultado.commits.map((commit, i) => (
                <li key={commit}>
                  <a href={commit} target="_blank" rel="noopener">
                    {resultado.commits.length > 1
                      ? `Ver o commit ${i + 1} de ${resultado.commits.length} no GitHub (abre em nova aba)`
                      : "Ver o commit no GitHub (abre em nova aba)"}
                  </a>
                </li>
              ))}
              <li>
                <a href={`/${ano}#${ancoraDoJogo(resultado.slug)}`} target="_blank" rel="noopener">
                  Ver no catálogo (abre em nova aba)
                </a>
              </li>
              <li>
                <a href={`/admin?ano=${ano}`}>Voltar ao painel</a>
              </li>
            </ul>
          </div>
        )}
        {resultado?.tipo === "erro" && (
          <div className={`${estilos.caixaErro} flex flex-col gap-3`}>
            <p className="font-bold">{resultado.texto}</p>
            {resultado.conflito && (
              <>
                <p>Salve um rascunho antes de recarregar, para não perder o que você digitou.</p>
                <button type="button" onClick={() => window.location.reload()} className={`${botao("secondary")} self-start`}>
                  Recarregar a página
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {erros.length > 0 && (
        <div ref={resumo} tabIndex={-1} className={estilos.caixaErro}>
          <h2 className="font-bold">
            Corrija {contar(erros.length, "campo", "campos")} antes de publicar:
          </h2>
          <ul className="mt-2 list-disc pl-6">
            {erros.map((erro) => (
              <li key={erro.id}>
                <a
                  href={`#${erro.id}`}
                  onClick={(evento) => {
                    evento.preventDefault();
                    const alvo = document.getElementById(erro.id);
                    alvo?.focus();
                    alvo?.scrollIntoView({ block: "center" });
                  }}
                >
                  {erro.rotulo}: {erro.mensagem}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          publicar();
        }}
        className="flex flex-col gap-6"
      >
        <p className={estilos.ajuda}>
          Na mesma ordem da ficha dos alunos. Campo deixado em branco não impede a publicação: ele aparece como
          pendência no painel.
        </p>

        <Grupo titulo="Dados do jogo">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idDoCampo(["turma"])} className={estilos.rotulo}>
              Turma
            </label>
            <select
              id={idDoCampo(["turma"])}
              value={entrada.turma}
              onChange={(e) => mudar(["turma"], e.target.value)}
              aria-invalid={erroDe(["turma"]) ? true : undefined}
              aria-describedby={erroDe(["turma"]) ? `${idDoCampo(["turma"])}-erro` : undefined}
              className={`${estilos.campo} max-w-xs`}
            >
              <option value="">Escolha a turma</option>
              {turmas.map((turma) => (
                <option key={turma} value={turma}>
                  {turma}
                </option>
              ))}
            </select>
            {erroDe(["turma"]) && (
              <p id={`${idDoCampo(["turma"])}-erro`} className={estilos.erroCampo}>
                {erroDe(["turma"])}
              </p>
            )}
          </div>

          {texto(["estudio"], "Estúdio")}
          <Campo
            id={idDoCampo(["nome"])}
            rotulo="Nome do jogo"
            valor={entrada.nome}
            aoMudar={mudarNome}
            erro={erroDe(["nome"])}
          />
          <Campo
            id={idDoCampo(["slug"])}
            rotulo="Endereço do jogo (slug)"
            valor={entrada.slug}
            aoMudar={(valor) => {
              setSlugManual(true);
              mudar(["slug"], valor);
            }}
            erro={erroDe(["slug"])}
            extra={{ autoCapitalize: "none", spellCheck: false, autoComplete: "off" }}
            ajuda={
              trocandoSlug
                ? `Ao publicar, o jogo sai de "${slugOriginal}" para este endereço, e os desenhos vão junto.`
                : "Gerado a partir do nome. Só letras minúsculas sem acento, números e hífens."
            }
          />

          <fieldset
            className="flex flex-col gap-2"
            aria-describedby={erroDe(["tema"]) ? `${idDoCampo(["tema"])}-erro` : undefined}
          >
            <legend className={estilos.rotulo}>Tema</legend>
            {(Object.keys(TEMAS) as (keyof typeof TEMAS)[]).map((tema, i) => (
              <label key={tema} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="tema"
                  id={i === 0 ? idDoCampo(["tema"]) : undefined}
                  value={tema}
                  checked={entrada.tema === tema}
                  onChange={() => mudar(["tema"], tema)}
                  aria-invalid={erroDe(["tema"]) ? true : undefined}
                  className="size-5 accent-tinta"
                />
                {TEMAS[tema].nome}
              </label>
            ))}
            {erroDe(["tema"]) && (
              <p id={`${idDoCampo(["tema"])}-erro`} className={estilos.erroCampo}>
                {erroDe(["tema"])}
              </p>
            )}
          </fieldset>

          {texto(["genero"], "Gênero", { ajuda: "Ex.: Aventura, corrida infinita, 3D" })}
          {texto(["plataforma"], "Plataforma", { ajuda: "Ex.: Celular e PC" })}
          {texto(["frase"], "Frase de efeito")}
          {texto(["sinopse"], "Sinopse", { linhas: 5 })}
        </Grupo>

        <Grupo titulo="Protagonista">
          {texto(["protagonista", "nome"], "Nome")}
          {texto(["protagonista", "quemE"], "Quem é", { linhas: 3 })}
          {texto(["protagonista", "habilidadeEspecial"], "Habilidade especial", { linhas: 2 })}
          {blocoDesenho("protagonista")}
        </Grupo>

        <Grupo titulo="Antagonista">
          {texto(["antagonista", "nome"], "Nome")}
          {texto(["antagonista", "motivacao"], "Motivação", { linhas: 2 })}
          {texto(["antagonista", "relacaoProtagonista"], "Relação com o protagonista", { linhas: 2 })}
          {blocoDesenho("antagonista")}
        </Grupo>

        <Grupo titulo="Mundo">
          {texto(["mundo", "lugar"], "Lugar")}
          {texto(["mundo", "epoca"], "Época")}
          <fieldset className="flex flex-col gap-3">
            <legend className={`${estilos.rotulo} mb-1`}>Características visuais (até 3)</legend>
            {Array.from({ length: CARACTERISTICAS }, (_, i) =>
              texto(["mundo", "caracteristicas", i], `Característica ${i + 1}`),
            )}
          </fieldset>
          {texto(["mundo", "clima"], "Clima")}
          {texto(["mundo", "inspiracao"], "Inspiração real")}
          {blocoDesenho("mundo")}
        </Grupo>

        <Grupo titulo="Como se joga">
          {entrada.controles.length === 0 && <p className={estilos.ajuda}>Nenhum controle cadastrado.</p>}
          {entrada.controles.map((controle, i) => (
            <fieldset key={i} className="flex flex-col gap-3 rounded-xl border-2 border-contorno p-4">
              <legend className="px-1 font-bold">Controle {i + 1}</legend>
              {texto(["controles", i, "acao"], "Ação", { ajuda: i === 0 ? "Ex.: Saltar, deslizar e desviar" : undefined })}
              {texto(["controles", i, "teclas"], "Teclas", {
                ajuda: "Separe por vírgula, ex.: W, A, S, D. Deixe vazio se a ação for automática.",
              })}
              <button
                type="button"
                onClick={() => removerLinha("controles", i)}
                className={`${botao("ghost")} self-start`}
              >
                Remover linha {i + 1}
                {controle.acao.trim() && `: ${controle.acao.trim()}`}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            id="adicionar-controles"
            onClick={() => adicionarLinha("controles")}
            className={`${botao("secondary")} self-start`}
          >
            Adicionar linha de controle
          </button>
        </Grupo>

        <Grupo titulo="Bastidores">
          {texto(["desafio"], "Desafio", { linhas: 3 })}
          {texto(["solucao"], "Solução", { linhas: 3 })}
        </Grupo>

        <Grupo titulo="Equipe">
          <p className={estilos.ajuda}>Só o primeiro nome de cada estudante.</p>
          {entrada.equipe.length === 0 && <p className={estilos.ajuda}>Ninguém na equipe ainda.</p>}
          {entrada.equipe.map((pessoa, i) => (
            <fieldset key={i} className="flex flex-col gap-3 rounded-xl border-2 border-contorno p-4">
              <legend className="px-1 font-bold">Pessoa {i + 1}</legend>
              {texto(["equipe", i, "nome"], "Primeiro nome", { extra: { autoComplete: "off" } })}
              {texto(["equipe", i, "funcao"], "Função", { ajuda: i === 0 ? "Ex.: Programadora" : undefined })}
              <button
                type="button"
                onClick={() => removerLinha("equipe", i)}
                className={`${botao("ghost")} self-start`}
              >
                Remover linha {i + 1}
                {pessoa.nome.trim() && `: ${pessoa.nome.trim()}`}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            id="adicionar-equipe"
            onClick={() => adicionarLinha("equipe")}
            className={`${botao("secondary")} self-start`}
          >
            Adicionar linha na equipe
          </button>
        </Grupo>

        <Grupo titulo="Publicação">
          {texto(["link"], "Link para jogar (opcional)", {
            ajuda: "Endereço completo, como https://... Sem link, o botão Jogar não aparece.",
            extra: { type: "url", inputMode: "url", autoCapitalize: "none", spellCheck: false },
          })}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 font-bold">
              <input
                type="checkbox"
                id={idDoCampo(["autorizacaoImagem"])}
                checked={entrada.autorizacaoImagem}
                onChange={(e) => mudar(["autorizacaoImagem"], e.target.checked)}
                aria-describedby="ajuda-autorizacao"
                className="mt-1 size-5 accent-tinta"
              />
              Termo de autorização de imagem assinado
            </label>
            <p id="ajuda-autorizacao" className={estilos.ajuda}>
              Sem o termo, os nomes da equipe não aparecem no catálogo.
            </p>
          </div>
        </Grupo>

        <div className="sticky bottom-0 z-1 flex flex-wrap items-center gap-3 border-t-[3px] border-tinta bg-papel-escuro py-4">
          <button type="button" onClick={salvarRascunho} disabled={desabilitar} className={botao("secondary")}>
            Salvar rascunho no navegador
          </button>
          <button type="submit" disabled={desabilitar} className={botao("primary")}>
            {enviando ? "Publicando..." : "Publicar"}
          </button>
          <p aria-live="polite" className="min-h-6 flex-1 basis-60">
            {status}
          </p>
        </div>
      </form>
    </div>
  );
}
