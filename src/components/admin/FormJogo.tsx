"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { idDoCampo, type ErroCampo } from "@/lib/admin/formulario";
import { pedir } from "@/lib/admin/pedir";
import { validarJogo } from "@/lib/admin/validacaoJogo";
import { classeBotao } from "@/lib/botoes";
import { ancoraDoJogo } from "@/lib/formato";
import { TEMAS } from "@/lib/temas";
import { Campo } from "./Campo";
import { Grupo } from "./Grupo";
import { Linhas } from "./Linhas";
import { CaixaResultado, useAvisoAoSair, useUrlsDePrevia, type Resultado } from "./publicacao";
import { juntarErros, ResumoErros } from "./ResumoErros";
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

/** Desenho escolhido nesta visita, já reduzido e convertido, esperando o "Publicar". */
type DesenhoNovo = ImagemPreparada & { arquivo: File; url: string; clarear: boolean };

type Rascunho = { salvoEm: string; entrada: EntradaJogo };

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

function lerRascunho(chave: string): Rascunho | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Rascunho) : null;
  } catch {
    return null;
  }
}

export function FormJogo(props: Props) {
  const { ano, turmas, inicial } = props;
  const [entrada, setEntrada] = useState(inicial);
  // Acompanha a troca de slug: os desenhos movidos continuam aparecendo como enviados.
  const [imagens, setImagens] = useState(props.imagens);
  const [sha, setSha] = useState(props.sha);
  const [slugOriginal, setSlugOriginal] = useState(props.slugOriginal);
  // Jogo já publicado: o slug não acompanha mais o nome sozinho.
  const [slugManual, setSlugManual] = useState(props.slugOriginal !== null);
  const [tentouPublicar, setTentouPublicar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errosServidor, setErrosServidor] = useState<ErroCampo[]>([]);
  const [status, setStatus] = useState("");
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [desenhosNovos, setDesenhosNovos] = useState<Partial<Record<TipoDesenho, DesenhoNovo>>>({});
  const [errosDesenho, setErrosDesenho] = useState<Partial<Record<TipoDesenho, string>>>({});
  /** Prévia local dos desenhos já publicados nesta visita (o site só os mostra depois do deploy). */
  const [previasPublicadas, setPreviasPublicadas] = useState<Partial<Record<TipoDesenho, string>>>({});
  /** Desenho sendo reduzido agora: os botões dele ficam travados até terminar. */
  const [preparando, setPreparando] = useState<Partial<Record<TipoDesenho, boolean>>>({});
  /** Conta as preparações de cada desenho: só vale o resultado da mais recente. */
  const ultimaPreparacao = useRef<Partial<Record<TipoDesenho, number>>>({});
  const urls = useUrlsDePrevia();

  const gravado = useRef(JSON.stringify(inicial));
  const resumo = useRef<HTMLDivElement>(null);
  const caixaResultado = useRef<HTMLDivElement>(null);
  // Segue o endereço atual do jogo: depois de publicar um jogo novo (ou trocar o slug),
  // o rascunho passa a ser o do jogo publicado, e não o de "Novo jogo".
  const chaveDe = (slug: string | null) => `admin-rascunho:${ano}:${slug ?? "novo"}`;
  const chaveRascunho = chaveDe(slugOriginal);

  // Endereços dos outros jogos: os da página, sem o deste jogo (o gravado e o atual, se trocou).
  const slugsOcupados = useMemo(
    () => props.slugsDaEdicao.filter((s) => s !== props.slugOriginal && s !== slugOriginal),
    [props.slugsDaEdicao, props.slugOriginal, slugOriginal],
  );
  // Os erros aparecem depois da primeira tentativa de publicar e somem conforme a pessoa corrige.
  // Antes disso, não valida a cada tecla.
  const errosLocais = useMemo(
    () => (tentouPublicar ? validarJogo(entrada, { ano, turmas, slugsOcupados }).erros : []),
    [tentouPublicar, entrada, ano, turmas, slugsOcupados],
  );
  const erros = juntarErros(errosLocais, errosServidor);
  const erroDe = (caminho: Caminho) => erros.find((e) => e.id === idDoCampo(caminho))?.mensagem;
  const alterado = JSON.stringify(entrada) !== gravado.current || Object.keys(desenhosNovos).length > 0;

  // Rascunho guardado neste navegador: oferece recuperar.
  useEffect(() => {
    const salvo = lerRascunho(chaveRascunho);
    if (salvo && JSON.stringify(salvo.entrada) !== gravado.current) setRascunho(salvo);
  }, [chaveRascunho]);

  useAvisoAoSair(alterado);

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
      for (const chave of chaves) window.localStorage.removeItem(chave);
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
    apagarRascunho(chaveRascunho);
    setRascunho(null);
    setStatus("Rascunho descartado.");
  }

  function mostrar(novo: Resultado) {
    setResultado(novo);
    setStatus("");
    requestAnimationFrame(() => caixaResultado.current?.focus());
  }

  async function publicar() {
    setTentouPublicar(true);
    setResultado(null);
    if (validarJogo(entrada, { ano, turmas, slugsOcupados }).erros.length > 0) {
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
    let slugFinal = slugOriginal;
    const commits: string[] = [];
    const enviados: TipoDesenho[] = [];
    const falhas: string[] = [];

    if (fichaMudou) {
      // Ficha e desenhos num commit só, se couberem numa requisição (medida em bytes,
      // com o envelope de cada parte). Se não, a ficha vai sozinha e os desenhos depois.
      const dados = { entrada, sha };
      const tamanho =
        new Blob([JSON.stringify(dados)]).size +
        ENVELOPE_POR_PARTE +
        novos.reduce((soma, tipo) => soma + desenhosNovos[tipo]!.blob.size + ENVELOPE_POR_PARTE, 0);
      const juntos = novos.length > 0 && tamanho <= LIMITE_POR_REQUISICAO;
      let corpo: object | FormData = dados;
      if (juntos) {
        const form = new FormData();
        form.append("dados", JSON.stringify(dados));
        for (const tipo of novos) form.append(`desenho-${tipo}`, desenhosNovos[tipo]!.blob, `${tipo}.webp`);
        corpo = form;
      }

      const { ok, status: codigo, corpo: r } = await pedir<{ slug: string; sha: string }>(
        slugOriginal ? `/api/admin/edicoes/${ano}/jogos/${slugOriginal}` : `/api/admin/edicoes/${ano}/jogos`,
        slugOriginal ? "PUT" : "POST",
        corpo,
      );
      if (!ok || !r.slug || !r.sha) {
        if (codigo === 422 && r.erros && r.erros.length > 0) {
          setErrosServidor(r.erros);
          setStatus("");
          focarNoResumo();
        } else {
          mostrar({ tipo: "erro", texto: r.erro ?? "Não foi possível publicar. Tente de novo.", conflito: codigo === 409 });
        }
        setEnviando(false);
        return;
      }

      const novoSlug = r.slug;
      slugFinal = novoSlug;
      if (r.commitUrl) commits.push(r.commitUrl);
      if (juntos) enviados.push(...novos);

      // Desenhos já gravados que mudaram de pasta com o slug.
      if (slugOriginal && slugOriginal !== novoSlug) {
        const antes = `/edicoes/${ano}/${slugOriginal}/`;
        const depois = `/edicoes/${ano}/${novoSlug}/`;
        setImagens((atuais) => atuais.map((src) => (src.startsWith(antes) ? depois + src.slice(antes.length) : src)));
      }
      setSha(r.sha);
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
      const { ok, corpo: r } = await pedir(`/api/admin/edicoes/${ano}/jogos/${slugFinal}/desenhos/${tipo}`, "PUT", form);
      if (ok) {
        enviados.push(tipo);
        if (r.commitUrl) commits.push(r.commitUrl);
      } else {
        falhas.push(`${NOMES_DESENHO[tipo]}: ${r.erro ?? "não foi enviado"}`);
      }
    }

    if (fichaMudou || enviados.length > 0) {
      // Os enviados passam a contar como "já enviados"; os que falharam ficam para tentar de novo.
      const slug = slugFinal!;
      setImagens((atuais) => [...new Set([...atuais, ...enviados.map((tipo) => srcDesenho(ano, slug, tipo))])]);
      setPreviasPublicadas((atuais) => {
        for (const tipo of enviados) urls.liberar(atuais[tipo]);
        return { ...atuais, ...Object.fromEntries(enviados.map((tipo) => [tipo, desenhosNovos[tipo]!.url])) };
      });
      setDesenhosNovos((atuais) =>
        Object.fromEntries(Object.entries(atuais).filter(([tipo]) => !enviados.includes(tipo as TipoDesenho))),
      );
      mostrar({
        tipo: "ok",
        commits,
        extra: falhas.length > 0 && (
          <div className={estilos.caixaErro}>
            <p className="font-bold">A ficha foi publicada, mas faltou enviar:</p>
            <ul className="list-disc pl-6">
              {falhas.map((falha) => (
                <li key={falha}>{falha}</li>
              ))}
            </ul>
            <p>Os desenhos que faltaram continuam escolhidos: clique em Publicar de novo para tentar.</p>
          </div>
        ),
      });
    } else {
      // Ficha igual e nenhum desenho chegou: nada foi publicado.
      mostrar({ tipo: "erro", texto: `Nenhum desenho foi enviado. ${falhas.join(" ")}`, conflito: false });
    }
    setEnviando(false);
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
      const url = urls.criar(preparada.blob);
      setDesenhosNovos((atuais) => {
        urls.liberar(atuais[tipo]?.url);
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
    urls.liberar(desenhosNovos[tipo]?.url);
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
            className={estilos.arquivo}
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
              className={classeBotao("toggle", novo.clarear)}
            >
              <span aria-hidden="true">{novo.clarear ? "■" : "□"}</span>
              Clarear fundo do papel
            </button>
            <button type="button" onClick={() => desfazerDesenho(tipo)} disabled={enviando} className={classeBotao("ghost")}>
              Desfazer a troca
            </button>
          </div>
        )}
        {texto(caminhoAlt, "Descrição do desenho (texto alternativo)", {
          linhas: 2,
          ajuda: "Obrigatória. Diga o que aparece no desenho, em uma ou duas frases.",
          acao: (
            <button type="button" onClick={sugerir} className={`${classeBotao("ghost")} self-start`}>
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
            <button type="button" onClick={recuperarRascunho} className={classeBotao("secondary")}>
              Recuperar rascunho
            </button>
            <button type="button" onClick={descartarRascunho} className={classeBotao("ghost")}>
              Descartar rascunho
            </button>
          </div>
        </div>
      )}

      <CaixaResultado
        resultado={resultado}
        ref={caixaResultado}
        links={[
          { href: `/${ano}#${ancoraDoJogo(slugOriginal ?? "")}`, texto: "Ver no catálogo", novaAba: true },
          { href: `/admin?ano=${ano}`, texto: "Voltar ao painel" },
        ]}
      />

      <ResumoErros erros={erros} ref={resumo} />

      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          publicar();
        }}
        className="flex flex-col gap-6"
      >
        {/* Travado durante o envio: nada digitado agora se perderia quando a resposta chegar. */}
        <fieldset disabled={enviando} className="contents">
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
          <Linhas
            itens={entrada.controles}
            aoMudar={(itens) => mudar(["controles"], itens)}
            novo={linhaControle}
            nomeDaLinha="Controle"
            descrever={(c) => c.acao}
            idPrimeiroCampo={(i) => idDoCampo(["controles", i, "acao"])}
            idAdicionar="adicionar-controles"
            rotuloAdicionar="Adicionar linha de controle"
            vazio="Nenhum controle cadastrado."
            anunciar={setStatus}
          >
            {(_, i) => (
              <>
                {texto(["controles", i, "acao"], "Ação", { ajuda: i === 0 ? "Ex.: Saltar, deslizar e desviar" : undefined })}
                {texto(["controles", i, "teclas"], "Teclas", {
                  ajuda: "Separe por vírgula, ex.: W, A, S, D. Deixe vazio se a ação for automática.",
                })}
              </>
            )}
          </Linhas>
        </Grupo>

        <Grupo titulo="Bastidores">
          {texto(["desafio"], "Desafio", { linhas: 3 })}
          {texto(["solucao"], "Solução", { linhas: 3 })}
        </Grupo>

        <Grupo titulo="Equipe">
          <p className={estilos.ajuda}>Só o primeiro nome de cada estudante.</p>
          <Linhas
            itens={entrada.equipe}
            aoMudar={(itens) => mudar(["equipe"], itens)}
            novo={linhaEquipe}
            nomeDaLinha="Pessoa"
            descrever={(p) => p.nome}
            idPrimeiroCampo={(i) => idDoCampo(["equipe", i, "nome"])}
            idAdicionar="adicionar-equipe"
            rotuloAdicionar="Adicionar linha na equipe"
            vazio="Ninguém na equipe ainda."
            anunciar={setStatus}
          >
            {(_, i) => (
              <>
                {texto(["equipe", i, "nome"], "Primeiro nome", { extra: { autoComplete: "off" } })}
                {texto(["equipe", i, "funcao"], "Função", { ajuda: i === 0 ? "Ex.: Programadora" : undefined })}
              </>
            )}
          </Linhas>
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
        </fieldset>

        <div className="sticky bottom-0 z-1 flex flex-wrap items-center gap-3 border-t-[3px] border-tinta bg-papel-escuro py-4">
          <button type="button" onClick={salvarRascunho} disabled={desabilitar} className={classeBotao("secondary")}>
            Salvar rascunho no navegador
          </button>
          <button type="submit" disabled={desabilitar} className={classeBotao("primary")}>
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
