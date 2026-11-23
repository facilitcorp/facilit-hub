import { clsx } from "clsx";
import { ArrowRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useListarDocumentos, useRemoverDocumento } from "@/api/documentos";
import { useListarAtualizacoesProjeto, useObterProjeto } from "@/api/projetos";
import { usePode } from "@/api/sessao";
import type { Documento } from "@/api/tipos";
import { Prazo, Responsavel, SeloStatusProjeto } from "@/componentes/projetos";
import { dataCurta, dataHora, haQuanto, notaVelha, urlSegura } from "@/dominio/formato";
import { projetoAberto } from "@/dominio/painel";
import { fasesProjeto, prioridades, tiposDocumento } from "@/dominio/rotulos";
import { Avatar, Botao, Cartao, Carregando, Falha, Progresso, Secao, Selo, Vazio } from "@/ui";
import { Modal } from "@/ui/Modal";
import { FormAtualizacao, FormDocumento, FormProjeto } from "./formularios";

function TrilhaFases({ fase }: { fase: string }) {
  const atual = fasesProjeto.findIndex((f) => f.valor === fase);
  return (
    <ol className="flex gap-1" aria-label="Fase do projeto">
      {fasesProjeto.map((f, i) => (
        <li key={f.valor} className="flex-1" aria-current={i === atual ? "step" : undefined}>
          <div className={clsx("h-1.5 rounded-full", i <= atual ? "bg-marca" : "bg-slate-200")} />
          <p
            className={clsx(
              "mt-1 text-[11px]",
              i === atual ? "font-semibold text-slate-900" : "text-slate-500",
            )}
          >
            {f.rotulo}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function Projeto() {
  const { id = "" } = useParams();
  const consulta = useObterProjeto(id);
  const notas = useListarAtualizacoesProjeto(id);
  const docs = useListarDocumentos({ projetoId: id });
  const remover = useRemoverDocumento();
  const podeEditar = usePode("projetos.editar");
  const podeAtualizar = usePode("projetos.atualizar");
  const podeDocs = usePode("documentos.editar");
  const [edicao, setEdicao] = useState<
    { tipo: "projeto" } | { tipo: "documento"; documento?: Documento } | null
  >(null);
  const fechar = () => setEdicao(null);

  if (consulta.isPending) return <Carregando />;
  if (consulta.isError) return <Falha erro={consulta.error} />;
  const p = consulta.data;
  const ultima = p.ultimaAtualizacao;
  const velha = projetoAberto(p) && notaVelha(ultima?.em);

  return (
    <div className="space-y-5">
      <nav className="text-sm text-slate-500">
        <Link to="/empresas" className="hover:text-marca">
          Empresas
        </Link>{" "}
        ›{" "}
        <Link to={`/empresas/${p.empresa.id}`} className="hover:text-marca">
          {p.empresa.nome}
        </Link>{" "}
        › <span className="text-slate-800">{p.nome}</span>
      </nav>

      <Cartao className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{p.nome}</h1>
              <SeloStatusProjeto status={p.status} />
              <Selo tom={prioridades[p.prioridade].tom}>
                Prioridade {prioridades[p.prioridade].rotulo.toLowerCase()}
              </Selo>
            </div>
            <Link
              to={`/empresas/${p.empresa.id}`}
              className="text-sm text-slate-500 hover:text-marca"
            >
              {p.empresa.nome}
            </Link>
          </div>
          {podeEditar && (
            <Botao variante="secundario" pequeno onClick={() => setEdicao({ tipo: "projeto" })}>
              <Pencil className="size-3.5" /> Editar projeto
            </Botao>
          )}
        </div>

        <div className={clsx("rounded-lg p-4", p.proximaAcao ? "bg-blue-50" : "bg-slate-50")}>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-blue-800 uppercase">
            <ArrowRight className="size-3.5" /> Próxima ação
          </p>
          <p className={clsx("mt-1", p.proximaAcao ? "font-medium" : "text-sm text-slate-500")}>
            {p.proximaAcao ?? "Nenhuma próxima ação definida. Use “Editar projeto” para registrar."}
          </p>
        </div>

        <div
          className={clsx(
            "rounded-lg border p-4",
            velha ? "border-amber-300 bg-amber-50" : "border-slate-200",
          )}
        >
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Última atualização
          </p>
          {ultima ? (
            <>
              <p className="mt-1 whitespace-pre-line">{ultima.texto}</p>
              <p
                className={clsx(
                  "mt-1 text-xs",
                  velha ? "font-medium text-amber-800" : "text-slate-500",
                )}
              >
                {ultima.autor?.nome ?? "—"} · {haQuanto(ultima.em)}
                {velha && " · projeto sem atualização recente"}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Ainda não há atualizações.</p>
          )}
        </div>

        <TrilhaFases fase={p.fase} />

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dado rotulo="Progresso">
            <Progresso valor={p.progresso} />
          </Dado>
          <Dado rotulo="Responsável">
            <Responsavel projeto={p} />
          </Dado>
          <Dado rotulo="Início previsto">{dataCurta(p.inicioPrevisto)}</Dado>
          <Dado rotulo="Prazo previsto">
            <Prazo projeto={p} />
          </Dado>
        </dl>
      </Cartao>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Secao titulo="Atualizações">
            {podeAtualizar && <FormAtualizacao projetoId={p.id} />}
            <div className="mt-5">
              {notas.isPending ? (
                <Carregando />
              ) : notas.isError ? (
                <Falha erro={notas.error} />
              ) : notas.data.itens.length === 0 ? (
                <Vazio>Nenhuma atualização registrada.</Vazio>
              ) : (
                <ol className="space-y-4 border-l border-slate-200 pl-4">
                  {notas.data.itens.map((n) => (
                    <li key={n.id} className="relative">
                      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Avatar nome={n.autor?.nome ?? "—"} /> {n.autor?.nome ?? "—"} ·{" "}
                        {dataHora(n.em)}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-line">{n.texto}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Secao>
        </div>
        <div className="space-y-5">
          <Secao titulo="Sobre o projeto">
            <dl className="space-y-3">
              <Dado rotulo="Descrição">
                {p.descricao ? (
                  <span className="whitespace-pre-line">{p.descricao}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Dado>
              <Dado rotulo="Objetivo">
                {p.objetivo ? (
                  <span className="whitespace-pre-line">{p.objetivo}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Dado>
            </dl>
          </Secao>
          <Secao
            titulo="Documentos e links"
            acao={
              podeDocs && (
                <Botao variante="fantasma" pequeno onClick={() => setEdicao({ tipo: "documento" })}>
                  <Plus className="size-3.5" /> Adicionar
                </Botao>
              )
            }
          >
            {docs.isPending ? (
              <Carregando />
            ) : docs.isError ? (
              <Falha erro={docs.error} />
            ) : docs.data.itens.length === 0 ? (
              <Vazio>Nenhum link registrado.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {docs.data.itens.map((d) => (
                  <li key={d.id} className="flex items-center gap-1 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.nome}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[tiposDocumento[d.tipo], d.observacao].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {urlSegura(d.url) && (
                      <a
                        href={urlSegura(d.url)}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Abrir ${d.nome}`}
                        className="p-1 text-marca"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    {podeDocs && (
                      <>
                        <button
                          aria-label={`Editar ${d.nome}`}
                          onClick={() => setEdicao({ tipo: "documento", documento: d })}
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          aria-label={`Remover ${d.nome}`}
                          onClick={() => {
                            if (window.confirm(`Remover "${d.nome}"?`)) remover.mutate(d.id);
                          }}
                          className="p-1 text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      </div>

      <Modal
        titulo={
          edicao?.tipo === "projeto"
            ? "Editar projeto"
            : edicao?.documento
              ? "Editar documento"
              : "Novo documento ou link"
        }
        aberto={edicao !== null}
        aoFechar={fechar}
        largo={edicao?.tipo === "projeto"}
      >
        {edicao?.tipo === "projeto" && <FormProjeto projeto={p} aoConcluir={fechar} />}
        {edicao?.tipo === "documento" && (
          <FormDocumento projetoId={p.id} documento={edicao.documento} aoConcluir={fechar} />
        )}
      </Modal>
    </div>
  );
}
