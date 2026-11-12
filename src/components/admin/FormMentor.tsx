"use client";

import { useMemo, useRef, useState } from "react";
import { caminhos, paraSrc } from "@/lib/admin/caminhos";
import { idDoCampo, type ErroCampo } from "@/lib/admin/formulario";
import { CARGOS, fotoDoMentor, slugDoMentor, validarMentor, type EntradaMentor } from "@/lib/admin/formularioMentor";
import { ACEITAR, prepararImagem, tamanhoLegivel } from "@/lib/admin/imagemNavegador";
import { pedir } from "@/lib/admin/pedir";
import { classeBotao } from "@/lib/botoes";
import { Campo } from "./Campo";
import { estilos } from "./estilos";
import { Grupo } from "./Grupo";
import { Linhas } from "./Linhas";
import { CaixaResultado, useAvisoAoSair, useUrlsDePrevia, type Resultado } from "./publicacao";
import { juntarErros, ResumoErros } from "./ResumoErros";

type Props = {
  inicial: EntradaMentor;
  /** Sha do mentores.json quando a tela foi aberta. */
  sha: string;
  /** Slug do mentor como está gravado; null para mentor novo. */
  slugOriginal: string | null;
  /** Slugs dos outros mentores, para o nome não repetir. */
  outrosSlugs: string[];
  /** A foto atual existe no repositório. */
  temFoto: boolean;
};

export function FormMentor({ inicial, outrosSlugs, ...props }: Props) {
  const [entrada, setEntrada] = useState(inicial);
  // Passa a valer depois de publicar uma foto nesta visita.
  const [temFoto, setTemFoto] = useState(props.temFoto);
  const [sha, setSha] = useState(props.sha);
  const [slugOriginal, setSlugOriginal] = useState(props.slugOriginal);
  const [tentouPublicar, setTentouPublicar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errosServidor, setErrosServidor] = useState<ErroCampo[]>([]);
  const [status, setStatus] = useState("");
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [erroFoto, setErroFoto] = useState("");
  /**
   * Prévia da foto publicada nesta visita. O endereço público só mostra a foto nova
   * depois do deploy (e o navegador pode ter a antiga em cache), então a prévia local fica.
   */
  const [previaPublicada, setPreviaPublicada] = useState<string | null>(null);
  const urls = useUrlsDePrevia();
  const gravado = useRef(JSON.stringify(inicial));
  const resumo = useRef<HTMLDivElement>(null);
  const caixaResultado = useRef<HTMLDivElement>(null);

  // Os erros só aparecem depois da primeira tentativa de publicar: antes disso, não valida a cada tecla.
  const errosLocais = useMemo(
    () => (tentouPublicar ? validarMentor(entrada, outrosSlugs).erros : []),
    [tentouPublicar, entrada, outrosSlugs],
  );
  const erros = juntarErros(errosLocais, errosServidor);
  const erroDe = (campo: string) => erros.find((e) => e.id === idDoCampo([campo]))?.mensagem;
  const alterado = JSON.stringify(entrada) !== gravado.current || foto !== null;
  useAvisoAoSair(alterado);

  function mudar<K extends keyof EntradaMentor>(chave: K, valor: EntradaMentor[K]) {
    setEntrada((atual) => ({ ...atual, [chave]: valor }));
    setErrosServidor([]);
  }

  async function escolherFoto(arquivo: File) {
    setErroFoto("");
    setStatus("Preparando a foto...");
    try {
      const { blob } = await prepararImagem(arquivo, false);
      urls.liberar(foto?.url);
      setFoto({ blob, url: urls.criar(blob) });
      setStatus(`Foto pronta (${tamanhoLegivel(blob.size)}). Ela é recortada em quadrado e enviada ao publicar.`);
    } catch (erro) {
      setErroFoto((erro as Error).message);
      setStatus((erro as Error).message);
    }
  }

  function mostrar(novo: Resultado) {
    setResultado(novo);
    setStatus("");
    requestAnimationFrame(() => caixaResultado.current?.focus());
  }

  async function publicar() {
    setTentouPublicar(true);
    setResultado(null);
    if (validarMentor(entrada, outrosSlugs).erros.length > 0) {
      requestAnimationFrame(() => resumo.current?.focus());
      return;
    }
    if (!alterado) {
      setStatus("Nada mudou desde a última publicação.");
      return;
    }
    setEnviando(true);
    setStatus("Publicando...");

    let corpo: object | FormData = { entrada, sha };
    if (foto) {
      const form = new FormData();
      form.append("dados", JSON.stringify(corpo));
      form.append("foto", foto.blob, "foto.webp");
      corpo = form;
    }
    const { ok, status: codigo, corpo: r } = await pedir<{ slug: string; sha: string }>(
      slugOriginal ? `/api/admin/mentores/${slugOriginal}` : "/api/admin/mentores",
      slugOriginal ? "PUT" : "POST",
      corpo,
    );
    if (ok && r.slug && r.sha) {
      setSha(r.sha);
      setSlugOriginal(r.slug);
      gravado.current = JSON.stringify(entrada);
      if (foto) {
        setTemFoto(true);
        urls.liberar(previaPublicada);
        setPreviaPublicada(foto.url);
      }
      setFoto(null);
      window.history.replaceState(null, "", `/admin/mentores/${r.slug}`);
      mostrar({ tipo: "ok", commits: r.commitUrl ? [r.commitUrl] : [] });
    } else if (codigo === 422 && r.erros && r.erros.length > 0) {
      setErrosServidor(r.erros);
      setStatus("");
      requestAnimationFrame(() => resumo.current?.focus());
    } else {
      mostrar({ tipo: "erro", texto: r.erro ?? "Não foi possível publicar.", conflito: codigo === 409 });
    }
    setEnviando(false);
  }

  // Foto que aparece: a nova escolhida agora, ou a gravada (com o nome atual da ficha gravada).
  const fotoGravada = temFoto && slugOriginal ? paraSrc(caminhos.fotoMentor(slugOriginal)) : null;
  const previa = foto?.url ?? previaPublicada ?? fotoGravada;
  const nomeMudou = slugOriginal !== null && slugDoMentor(entrada.nome) !== slugOriginal && slugDoMentor(entrada.nome) !== "";

  return (
    <div className="flex flex-col gap-6">
      <CaixaResultado
        resultado={resultado}
        ref={caixaResultado}
        links={[{ href: "/admin/mentores", texto: "Voltar à lista de mentores" }]}
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
          <Grupo titulo="Quem é">
            <Campo
              id={idDoCampo(["nome"])}
              rotulo="Nome"
              valor={entrada.nome}
              aoMudar={(v) => mudar("nome", v)}
              erro={erroDe("nome")}
              ajuda={nomeMudou ? `Ao publicar, a foto passa a se chamar ${fotoDoMentor(entrada.nome)}.` : undefined}
              extra={{ autoComplete: "off" }}
            />
            <fieldset
              className="flex flex-col gap-2"
              aria-describedby={erroDe("cargo") ? `${idDoCampo(["cargo"])}-erro` : undefined}
            >
              <legend className={estilos.rotulo}>Cargo</legend>
              {CARGOS.map((cargo, i) => (
                <label key={cargo.valor} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="cargo"
                    id={i === 0 ? idDoCampo(["cargo"]) : undefined}
                    checked={entrada.cargo === cargo.valor}
                    onChange={() => mudar("cargo", cargo.valor)}
                    aria-invalid={erroDe("cargo") ? true : undefined}
                    className="size-5 accent-tinta"
                  />
                  {cargo.nome}
                </label>
              ))}
              {erroDe("cargo") && (
                <p id={`${idDoCampo(["cargo"])}-erro`} className={estilos.erroCampo}>
                  {erroDe("cargo")}
                </p>
              )}
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={entrada.lider}
                  onChange={(e) => mudar("lider", e.target.checked)}
                  aria-describedby="ajuda-lider"
                  className="mt-1 size-5 accent-tinta"
                />
                Líder
              </label>
              <p id="ajuda-lider" className={estilos.ajuda}>
                Aparece em destaque, na primeira página de mentores.
              </p>
            </div>
            <Campo id={idDoCampo(["classe"])} rotulo="Classe" valor={entrada.classe} aoMudar={(v) => mudar("classe", v)} ajuda="Ex.: Godot Engine Architect & Game Developer" />
          </Grupo>

          <Grupo titulo="Foto">
            {previa ? (
              <figure className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob) ou foto do próprio catálogo */}
                <img
                  src={previa}
                  alt={`Foto de ${entrada.nome.trim() || "mentor"}`}
                  className="size-32 rounded-full border-2 border-tinta object-cover"
                />
                <figcaption className={estilos.ajuda}>
                  {foto
                    ? "Foto nova, ainda não publicada. O servidor recorta um quadrado de 192 pixels, centrado no rosto."
                    : previaPublicada
                      ? "Foto publicada."
                      : "Foto atual."}
                </figcaption>
              </figure>
            ) : (
              <p className={estilos.ajuda}>Ainda sem foto. No catálogo aparece um quadro vazio no lugar.</p>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="foto-arquivo" className={estilos.rotulo}>
                {previa ? "Trocar a foto" : "Escolher a foto"} (JPG, PNG ou WebP)
              </label>
              <input
                id="foto-arquivo"
                type="file"
                accept={ACEITAR}
                aria-invalid={erroFoto ? true : undefined}
                aria-describedby={erroFoto ? "foto-arquivo-erro" : undefined}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) escolherFoto(arquivo);
                }}
                className={estilos.arquivo}
              />
              {erroFoto && (
                <p id="foto-arquivo-erro" className={estilos.erroCampo}>
                  {erroFoto}
                </p>
              )}
            </div>
            {foto && (
              <button
                type="button"
                onClick={() => {
                  urls.liberar(foto.url);
                  setFoto(null);
                  const campo = document.getElementById("foto-arquivo") as HTMLInputElement | null;
                  if (campo) campo.value = "";
                  setStatus("Troca da foto desfeita.");
                }}
                className={`${classeBotao("ghost")} self-start`}
              >
                Desfazer a troca da foto
              </button>
            )}
          </Grupo>

          <Grupo titulo="Formação">
            <Linhas
              itens={entrada.skills}
              aoMudar={(itens) => mudar("skills", itens)}
              novo={() => ""}
              nomeDaLinha="Formação"
              descrever={(s) => s}
              idPrimeiroCampo={(i) => idDoCampo(["skills", i])}
              idAdicionar="adicionar-formacao"
              rotuloAdicionar="Adicionar formação"
              vazio="Nenhuma formação cadastrada."
              anunciar={setStatus}
            >
              {(item, i) => (
                <Campo
                  id={idDoCampo(["skills", i])}
                  rotulo="Curso ou título"
                  valor={item}
                  aoMudar={(v) => mudar("skills", entrada.skills.map((s, j) => (j === i ? v : s)))}
                  ajuda={i === 0 ? "Ex.: Licenciada em Matemática" : undefined}
                />
              )}
            </Linhas>
          </Grupo>

          <Grupo titulo="Habilidades">
            <Campo
              id={idDoCampo(["specialAbility"])}
              rotulo="Habilidade especial"
              valor={entrada.specialAbility}
              aoMudar={(v) => mudar("specialAbility", v)}
              linhas={3}
            />
            <fieldset className="flex flex-col gap-3">
              <legend className={`${estilos.rotulo} mb-1`}>Side quests (outros trabalhos e projetos)</legend>
              <Linhas
                itens={entrada.sideQuests}
                aoMudar={(itens) => mudar("sideQuests", itens)}
                novo={() => ""}
                nomeDaLinha="Side quest"
                descrever={(s) => s}
                idPrimeiroCampo={(i) => idDoCampo(["sideQuests", i])}
                idAdicionar="adicionar-side-quest"
                rotuloAdicionar="Adicionar side quest"
                vazio="Nenhuma side quest cadastrada."
                anunciar={setStatus}
              >
                {(item, i) => (
                  <Campo
                    id={idDoCampo(["sideQuests", i])}
                    rotulo="Descrição"
                    valor={item}
                    aoMudar={(v) => mudar("sideQuests", entrada.sideQuests.map((s, j) => (j === i ? v : s)))}
                  />
                )}
              </Linhas>
            </fieldset>
            <Campo
              id={idDoCampo(["funFact"])}
              rotulo="Curiosidade"
              valor={entrada.funFact}
              aoMudar={(v) => mudar("funFact", v)}
              linhas={3}
            />
          </Grupo>
        </fieldset>

        <div className="sticky bottom-0 z-1 flex flex-wrap items-center gap-3 border-t-[3px] border-tinta bg-papel-escuro py-4">
          <button type="submit" disabled={enviando} className={classeBotao("primary")}>
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
