"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  linhaCredito,
  linhaTurma,
  validarEdicao,
  type EntradaEdicao,
  type LinhaTurma,
} from "@/lib/admin/formularioEdicao";
import { idDoCampo, type ErroCampo } from "@/lib/admin/validacaoJogo";
import { BASE_BOTAO, estiloBotao } from "@/lib/botoes";
import { contar } from "@/lib/formato";
import { Campo } from "./Campo";
import { estilos } from "./estilos";
import { Grupo } from "./Grupo";
import { Linhas } from "./Linhas";
import { juntarErros, ResumoErros } from "./ResumoErros";

type Props = {
  ano: string;
  inicial: EntradaEdicao;
  sha: string;
  /** Nomes dos mentores, para escolher o de cada turma. */
  mentores: string[];
  /** Quantos jogos cada turma tem hoje (pelo nome gravado). */
  jogosPorTurma: Record<string, number>;
};

type Resultado =
  | { tipo: "ok"; commitUrl: string; jogosAtualizados: number }
  | { tipo: "erro"; texto: string; conflito: boolean };

const botao = (variante: "primary" | "secondary" | "ghost") => `${BASE_BOTAO} ${estiloBotao(variante)}`;

export function FormEdicao({ ano, inicial, mentores, ...props }: Props) {
  const [entrada, setEntrada] = useState(inicial);
  // Acompanha a troca de nome das turmas depois de publicar.
  const [jogosPorTurma, setJogosPorTurma] = useState(props.jogosPorTurma);
  const [sha, setSha] = useState(props.sha);
  const [tentouPublicar, setTentouPublicar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errosServidor, setErrosServidor] = useState<ErroCampo[]>([]);
  const [status, setStatus] = useState("");
  const gravado = useRef(JSON.stringify(inicial));
  const resumo = useRef<HTMLDivElement>(null);
  const caixaResultado = useRef<HTMLDivElement>(null);

  const errosLocais = useMemo(() => validarEdicao(entrada, ano).erros, [entrada, ano]);
  const erros = tentouPublicar ? juntarErros(errosLocais, errosServidor) : [];
  const erroDe = (caminho: (string | number)[]) => erros.find((e) => e.id === idDoCampo(caminho))?.mensagem;
  const alterado = JSON.stringify(entrada) !== gravado.current;

  useEffect(() => {
    if (!alterado) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  function mudar<K extends keyof EntradaEdicao>(chave: K, valor: EntradaEdicao[K]) {
    setEntrada((atual) => ({ ...atual, [chave]: valor }));
    setErrosServidor([]);
  }

  function mudarTurma(indice: number, campo: keyof LinhaTurma, valor: string) {
    mudar(
      "turmas",
      entrada.turmas.map((t, i) => (i === indice ? { ...t, [campo]: valor } : t)),
    );
  }

  function mudarCredito(indice: number, campo: "funcao" | "nome", valor: string) {
    mudar(
      "creditos",
      entrada.creditos.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)),
    );
  }

  async function publicar() {
    setTentouPublicar(true);
    setResultado(null);
    if (errosLocais.length > 0) {
      requestAnimationFrame(() => resumo.current?.focus());
      return;
    }
    if (!alterado) {
      setStatus("Nada mudou desde a última publicação.");
      return;
    }
    setEnviando(true);
    setStatus("Publicando...");
    const mostrar = (novo: Resultado) => {
      setResultado(novo);
      setStatus("");
      requestAnimationFrame(() => caixaResultado.current?.focus());
    };
    try {
      const resposta = await fetch(`/api/admin/edicoes/${ano}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entrada, sha }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        erros?: ErroCampo[];
        sha?: string;
        commitUrl?: string;
        jogosAtualizados?: number;
      };
      if (resposta.ok && corpo.sha) {
        setSha(corpo.sha);
        // Os jogos das turmas renomeadas passam a contar no nome novo.
        setJogosPorTurma((atual) => {
          const novo = { ...atual };
          for (const t of entrada.turmas) {
            const id = t.id.trim();
            if (!t.original || t.original === id || !(t.original in atual)) continue;
            novo[id] = atual[t.original];
            delete novo[t.original];
          }
          return novo;
        });
        // Os campos ficaram travados durante o envio: o que está na tela é o que foi publicado.
        // Depois de publicar, o nome de cada turma passa a ser o "original" dela.
        const publicada = {
          ...entrada,
          turmas: entrada.turmas.map((t) => ({ ...t, original: t.id.trim() || null })),
        };
        setEntrada(publicada);
        gravado.current = JSON.stringify(publicada);
        mostrar({ tipo: "ok", commitUrl: corpo.commitUrl ?? "", jogosAtualizados: corpo.jogosAtualizados ?? 0 });
      } else if (resposta.status === 422 && corpo.erros && corpo.erros.length > 0) {
        setErrosServidor(corpo.erros);
        setStatus("");
        requestAnimationFrame(() => resumo.current?.focus());
      } else {
        mostrar({ tipo: "erro", texto: corpo.erro ?? "Não foi possível publicar.", conflito: resposta.status === 409 });
      }
    } catch {
      mostrar({ tipo: "erro", texto: "Sem conexão com o servidor. Nada foi publicado.", conflito: false });
    }
    setEnviando(false);
  }

  // Mentor gravado que não está mais na lista de mentores continua como opção.
  const opcoesMentor = (atual: string) => (atual && !mentores.includes(atual) ? [...mentores, atual] : mentores);

  return (
    <div className="flex flex-col gap-6">
      <div ref={caixaResultado} tabIndex={-1} className={resultado ? "" : "sr-only"}>
        {resultado?.tipo === "ok" && (
          <div className={`${estilos.caixaOk} flex flex-col gap-2`}>
            <p className="font-bold">
              {resultado.commitUrl
                ? "Publicado! O catálogo atualiza em cerca de 2 minutos."
                : "Salvo no modo local: os arquivos do projeto foram atualizados, sem commit."}
            </p>
            {resultado.jogosAtualizados > 0 && (
              <p>{contar(resultado.jogosAtualizados, "jogo foi levado", "jogos foram levados")} para o novo nome da turma.</p>
            )}
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {resultado.commitUrl && (
                <li>
                  <a href={resultado.commitUrl} target="_blank" rel="noopener">
                    Ver o commit no GitHub (abre em nova aba)
                  </a>
                </li>
              )}
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
              <button type="button" onClick={() => window.location.reload()} className={`${botao("secondary")} self-start`}>
                Recarregar a página (o que você digitou se perde)
              </button>
            )}
          </div>
        )}
      </div>

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
        <Grupo titulo="Abertura">
          <Campo
            id={idDoCampo(["titulo"])}
            rotulo="Título da edição"
            valor={entrada.titulo}
            aoMudar={(v) => mudar("titulo", v)}
            erro={erroDe(["titulo"])}
            ajuda="Ex.: Mostra Cultural • LEVEL UP 2026"
          />
          <Campo
            id={idDoCampo(["textoAbertura"])}
            rotulo="Texto de abertura"
            valor={entrada.textoAbertura}
            aoMudar={(v) => mudar("textoAbertura", v)}
            erro={erroDe(["textoAbertura"])}
            linhas={6}
          />
          <Campo
            id={idDoCampo(["agradecimento"])}
            rotulo="Agradecimento (opcional)"
            valor={entrada.agradecimento}
            aoMudar={(v) => mudar("agradecimento", v)}
            linhas={4}
          />
        </Grupo>

        <Grupo titulo="Turmas">
          <p className={estilos.ajuda}>
            A ordem aqui é a ordem dos mundos no catálogo. Ao mudar o nome de uma turma, os jogos dela vão junto.
          </p>
          <Linhas
            itens={entrada.turmas}
            aoMudar={(turmas) => mudar("turmas", turmas)}
            novo={linhaTurma}
            nomeDaLinha="Turma"
            descrever={(t) => t.id}
            idPrimeiroCampo={(i) => idDoCampo(["turmas", i, "id"])}
            idAdicionar="adicionar-turma"
            rotuloAdicionar="Adicionar turma"
            vazio="Nenhuma turma cadastrada."
            anunciar={setStatus}
          >
            {(turma, i) => {
              const jogos = turma.original ? (jogosPorTurma[turma.original] ?? 0) : 0;
              const renomeando = turma.original !== null && turma.id.trim() !== turma.original;
              const idMentor = idDoCampo(["turmas", i, "mentor"]);
              return (
                <>
                  <Campo
                    id={idDoCampo(["turmas", i, "id"])}
                    rotulo="Nome da turma"
                    valor={turma.id}
                    aoMudar={(v) => mudarTurma(i, "id", v)}
                    erro={erroDe(["turmas", i, "id"])}
                    ajuda={
                      renomeando && jogos > 0
                        ? `Ao publicar, ${contar(jogos, "jogo", "jogos")} de "${turma.original}" ${jogos === 1 ? "passa" : "passam"} para este nome.`
                        : jogos > 0
                          ? `${contar(jogos, "jogo cadastrado", "jogos cadastrados")} nesta turma.`
                          : undefined
                    }
                  />
                  <Campo
                    id={idDoCampo(["turmas", i, "lema"])}
                    rotulo="Lema (opcional)"
                    valor={turma.lema}
                    aoMudar={(v) => mudarTurma(i, "lema", v)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={idMentor} className={estilos.rotulo}>
                      Mentor (opcional)
                    </label>
                    <select
                      id={idMentor}
                      value={turma.mentor}
                      onChange={(e) => mudarTurma(i, "mentor", e.target.value)}
                      className={`${estilos.campo} max-w-md`}
                    >
                      <option value="">Sem mentor</option>
                      {opcoesMentor(turma.mentor).map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              );
            }}
          </Linhas>
        </Grupo>

        <Grupo titulo="Créditos">
          <Linhas
            itens={entrada.creditos}
            aoMudar={(creditos) => mudar("creditos", creditos)}
            novo={linhaCredito}
            nomeDaLinha="Crédito"
            descrever={(c) => c.funcao}
            idPrimeiroCampo={(i) => idDoCampo(["creditos", i, "funcao"])}
            idAdicionar="adicionar-credito"
            rotuloAdicionar="Adicionar crédito"
            vazio="Nenhum crédito cadastrado."
            anunciar={setStatus}
          >
            {(credito, i) => (
              <>
                <Campo
                  id={idDoCampo(["creditos", i, "funcao"])}
                  rotulo="Função"
                  valor={credito.funcao}
                  aoMudar={(v) => mudarCredito(i, "funcao", v)}
                  ajuda={i === 0 ? "Ex.: Coordenação, Professores, Escola" : undefined}
                />
                <Campo
                  id={idDoCampo(["creditos", i, "nome"])}
                  rotulo="Nomes"
                  valor={credito.nome}
                  aoMudar={(v) => mudarCredito(i, "nome", v)}
                  ajuda={i === 0 ? "Vários nomes: separe por vírgula." : undefined}
                />
              </>
            )}
          </Linhas>
        </Grupo>
        </fieldset>

        <div className="sticky bottom-0 z-1 flex flex-wrap items-center gap-3 border-t-[3px] border-tinta bg-papel-escuro py-4">
          <button type="submit" disabled={enviando} className={botao("primary")}>
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
