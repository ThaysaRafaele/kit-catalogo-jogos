"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CARACTERISTICAS,
  gerarSlug,
  linhaControle,
  linhaEquipe,
  srcDesenho,
  sugerirAlt,
  type EntradaJogo,
  type TipoDesenho,
} from "@/lib/admin/formularioJogo";
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
  | { tipo: "ok"; slug: string; commitUrl: string }
  | { tipo: "erro"; texto: string; conflito: boolean };

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

const NOMES_DESENHO: Record<TipoDesenho, string> = {
  protagonista: "Desenho do protagonista",
  antagonista: "Desenho do antagonista",
  mundo: "Desenho do mundo",
};

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
  const alterado = JSON.stringify(entrada) !== gravado.current;

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
      setStatus(`Rascunho salvo neste navegador às ${new Date().toLocaleTimeString("pt-BR", { timeStyle: "short" })}.`);
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

    setEnviando(true);
    setStatus("Publicando...");
    const url = slugOriginal ? `/api/admin/edicoes/${ano}/jogos/${slugOriginal}` : `/api/admin/edicoes/${ano}/jogos`;
    try {
      const resposta = await fetch(url, {
        method: slugOriginal ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entrada, sha }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        erros?: ErroCampo[];
        slug?: string;
        sha?: string;
        commitUrl?: string;
      };

      if (resposta.ok && corpo.slug && corpo.sha) {
        const novoSlug = corpo.slug;
        setSlugsDaEdicao((atuais) => [...atuais.filter((s) => s !== slugOriginal && s !== novoSlug), novoSlug]);
        if (slugOriginal && slugOriginal !== novoSlug) {
          const antes = `/edicoes/${ano}/${slugOriginal}/`;
          setImagens((atuais) => atuais.map((src) => (src.startsWith(antes) ? src.replace(antes, `/edicoes/${ano}/${novoSlug}/`) : src)));
        }
        setSha(corpo.sha);
        setSlugOriginal(novoSlug);
        setSlugManual(true);
        gravado.current = JSON.stringify(entrada);
        // O rascunho do endereço antigo (ou de "Novo jogo") e o do novo: os dois ficaram velhos.
        apagarRascunho(chaveDe(slugOriginal), chaveDe(novoSlug));
        setResultado({ tipo: "ok", slug: novoSlug, commitUrl: corpo.commitUrl ?? "" });
        // O endereço passa a ser o da edição do jogo, sem recarregar a página.
        window.history.replaceState(null, "", `/admin/${ano}/jogo/${novoSlug}`);
        setStatus("");
        requestAnimationFrame(() => caixaResultado.current?.focus());
      } else if (resposta.status === 422 && corpo.erros && corpo.erros.length > 0) {
        setErrosServidor(corpo.erros);
        setStatus("");
        focarNoResumo();
      } else {
        setResultado({
          tipo: "erro",
          texto: corpo.erro ?? "Não foi possível publicar. Tente de novo.",
          conflito: resposta.status === 409,
        });
        setStatus("");
        requestAnimationFrame(() => caixaResultado.current?.focus());
      }
    } catch {
      setResultado({ tipo: "erro", texto: "Sem conexão com o servidor. Nada foi publicado.", conflito: false });
      setStatus("");
      requestAnimationFrame(() => caixaResultado.current?.focus());
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

  function blocoDesenho(tipo: TipoDesenho) {
    const caminhoAlt = [tipo, "desenho", "alt"];
    const src = srcDesenho(ano, slugOriginal ?? (entrada.slug || "novo"), tipo);
    const enviado = slugOriginal !== null && imagens.includes(src);
    const alt = entrada[tipo].desenho.alt;

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
        {enviado ? (
          <figure className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem do próprio catálogo, já em WebP */}
            <img src={src} alt={alt} className="max-h-60 w-fit rounded-lg border-2 border-tinta bg-papel-claro" />
            <figcaption className={estilos.ajuda}>Desenho já enviado.</figcaption>
          </figure>
        ) : (
          <p className={estilos.ajuda}>Ainda sem desenho enviado. No catálogo aparece um quadro vazio no lugar.</p>
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
  const desabilitar = enviando;

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
              {resultado.commitUrl
                ? "Publicado! O catálogo atualiza em cerca de 2 minutos."
                : "Salvo no modo local: os arquivos do projeto foram atualizados, sem commit."}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {resultado.commitUrl && (
                <li>
                  <a href={resultado.commitUrl} target="_blank" rel="noopener">
                    Ver o commit no GitHub (abre em nova aba)
                  </a>
                </li>
              )}
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
