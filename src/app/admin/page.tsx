import type { Metadata } from "next";
import { ProvedorAviso } from "@/components/admin/Aviso";
import { estilos } from "@/components/admin/estilos";
import { BotaoExcluir } from "@/components/admin/BotaoExcluir";
import { NovaEdicao } from "@/components/admin/NovaEdicao";
import { listarAnos, painelDaEdicao, type ResumoJogo, type StatusJogo } from "@/lib/admin/dados";
import { classeBotao } from "@/lib/botoes";
import { ancoraDoJogo, contar } from "@/lib/formato";

export const metadata: Metadata = { title: "Painel" };

type Props = { searchParams: Promise<{ ano?: string }> };

const STATUS: Record<StatusJogo, { texto: string; contagem: [string, string]; classe: string }> = {
  completo: { texto: "Completo", contagem: ["completo", "completos"], classe: "border-floresta bg-[#e7f5df]" },
  pendente: { texto: "Pendente", contagem: ["pendente", "pendentes"], classe: "border-brasa bg-creme" },
  semAutorizacao: { texto: "Sem autorização de imagem", contagem: ["sem autorização", "sem autorização"], classe: "border-noite bg-[#ecebf5]" },
  invalido: { texto: "Com erro: impede a publicação", contagem: ["com erro", "com erro"], classe: "border-erro bg-erro-fundo" },
};

function CartaoJogo({ ano, jogo }: { ano: string; jogo: ResumoJogo }) {
  const status = STATUS[jogo.status];
  const idNome = `jogo-${jogo.slug}-nome`;
  return (
    <li className="rounded-xl border-2 border-tinta bg-papel-claro p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id={idNome} className="text-xl font-bold text-tinta">
          {jogo.nome}
        </h4>
        <p className={`rounded-full border-2 px-3 py-0.5 text-base font-bold text-tinta ${status.classe}`}>
          <span className="sr-only">Status: </span>
          {status.texto}
        </p>
      </div>
      {jogo.estudio && <p className={estilos.ajuda}>Estúdio {jogo.estudio}</p>}

      {jogo.erro && (
        <div className={`${estilos.caixaErro} mt-3`}>
          <p className="font-bold">Este jogo não entra no catálogo até ser corrigido:</p>
          <pre className="mt-1 font-nunito text-base whitespace-pre-wrap">{jogo.erro}</pre>
        </div>
      )}

      {jogo.pendencias.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer">
            {contar(jogo.pendencias.length, "pendência", "pendências")}
            {jogo.status !== "pendente" && " na ficha"}
          </summary>
          <ul className="mt-2 list-disc pl-6">
            {jogo.pendencias.map((pendencia) => (
              <li key={pendencia}>{pendencia}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`/admin/${ano}/jogo/${jogo.slug}`} className={classeBotao("secondary")} aria-label={`Editar ${jogo.nome}`}>
          Editar
        </a>
        <a
          href={`/${ano}#${ancoraDoJogo(jogo.slug)}`}
          target="_blank"
          rel="noopener"
          className={classeBotao("ghost")}
          aria-label={`Ver ${jogo.nome} no catálogo (abre em nova aba)`}
        >
          Ver no catálogo
        </a>
        <BotaoExcluir
          nome={jogo.nome}
          url={`/api/admin/edicoes/${ano}/jogos/${jogo.slug}`}
          corpo={{ sha: jogo.sha }}
          explicacao="A ficha e os três desenhos saem do catálogo."
        />
      </div>
    </li>
  );
}

export default async function Painel({ searchParams }: Props) {
  const anos = await listarAnos();
  const pedido = (await searchParams).ano;
  const ano = pedido && anos.includes(pedido) ? pedido : anos[0];
  const painel = ano ? await painelDaEdicao(ano) : null;

  const maisRecente = anos[0] ? Number(anos[0]) : new Date().getFullYear() - 1;
  const proximo = maisRecente + 1;
  const tituloAnterior = ano === anos[0] ? painel?.edicao?.titulo : undefined;
  const tituloSugerido = tituloAnterior?.includes(String(maisRecente))
    ? tituloAnterior.replace(String(maisRecente), String(proximo))
    : `Mostra Cultural • ${proximo}`;

  // Jogos por turma, na ordem da edição. Turma que não existe vai para um grupo à parte.
  const grupos = painel
    ? [
        ...painel.turmas.map((turma) => ({ turma, jogos: painel.jogos.filter((j) => j.turma === turma) })),
        { turma: "", jogos: painel.jogos.filter((j) => !painel.turmas.includes(j.turma)) },
      ].filter((grupo) => grupo.turma || grupo.jogos.length > 0)
    : [];

  const totais = painel
    ? (Object.keys(STATUS) as StatusJogo[])
        .map((status) => ({ status, quantos: painel.jogos.filter((j) => j.status === status).length }))
        .filter((t) => t.quantos > 0)
    : [];

  return (
    <ProvedorAviso>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className={estilos.titulo}>Painel</h1>
          {anos.length > 0 && (
            <nav aria-label="Edições">
              <ul className="flex flex-wrap gap-2">
                {anos.map((a) => (
                  <li key={a}>
                    <a
                      href={`/admin?ano=${a}`}
                      aria-current={a === ano ? "page" : undefined}
                      className={classeBotao("chip", a === ano)}
                    >
                      Edição {a}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <NovaEdicao anoSugerido={proximo} tituloSugerido={tituloSugerido} />
        </div>

        {!painel ? (
          <p>Nenhuma edição cadastrada ainda. Crie a primeira acima.</p>
        ) : (
          <section aria-labelledby="titulo-edicao" className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 id="titulo-edicao" className={estilos.subtitulo}>
                Edição {painel.ano}
                {painel.edicao && `: ${painel.edicao.titulo}`}
              </h2>
              {painel.erroEdicao && (
                <div className={estilos.caixaErro}>
                  <p className="font-bold">O edicao.json desta edição tem erro e impede a publicação:</p>
                  <pre className="mt-1 font-nunito text-base whitespace-pre-wrap">{painel.erroEdicao}</pre>
                </div>
              )}
              <p>
                {contar(painel.jogos.length, "jogo", "jogos")}
                {totais.length > 0 &&
                  `: ${totais.map((t) => contar(t.quantos, ...STATUS[t.status].contagem)).join(", ")}`}
                .
              </p>
              <div className="flex flex-wrap gap-3">
                {painel.turmas.length > 0 ? (
                  <a href={`/admin/${painel.ano}/jogo/novo`} className={classeBotao("primary")}>
                    Novo jogo
                  </a>
                ) : (
                  <p className={estilos.caixaErro}>
                    Esta edição ainda não tem turmas. Cadastre as turmas em &quot;Dados da edição&quot; para incluir
                    jogos.
                  </p>
                )}
                <a href={`/admin/${painel.ano}/edicao`} className={classeBotao("secondary")}>
                  Dados da edição
                </a>
                <a href="/admin/mentores" className={classeBotao("ghost")}>
                  Mentores
                </a>
              </div>
            </div>

            {/* Id pela posição: nomes como "1º H" têm espaço e quebrariam o aria-labelledby. */}
            {grupos.map((grupo, i) => (
              <section key={grupo.turma || "sem-turma"} aria-labelledby={`grupo-turma-${i + 1}`}>
                <h3 id={`grupo-turma-${i + 1}`} className="text-2xl font-bold text-vinho">
                  {grupo.turma ? `Turma ${grupo.turma}` : "Turma não cadastrada na edição"}
                  <span className="ml-2 text-lg font-normal text-suave">
                    ({contar(grupo.jogos.length, "jogo", "jogos")})
                  </span>
                </h3>
                {grupo.jogos.length === 0 ? (
                  <p className="mt-2 text-suave">Nenhum jogo cadastrado nesta turma.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-4">
                    {grupo.jogos.map((jogo) => (
                      <CartaoJogo key={jogo.slug} ano={painel.ano} jogo={jogo} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </section>
        )}
      </div>
    </ProvedorAviso>
  );
}
