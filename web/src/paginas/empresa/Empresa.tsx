import { ExternalLink, Globe, Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useObterEmpresa } from "@/api/empresas";
import { useListarProjetos } from "@/api/projetos";
import { useNomeOrganizacao, usePode } from "@/api/sessao";
import type { Empresa as TEmpresa, LinkCanal } from "@/api/tipos";
import { SeloStatusEmpresa } from "@/componentes/empresas";
import { NovoProjeto } from "@/componentes/NovoProjeto";
import { CartoesProjetos } from "@/componentes/projetos";
import { telefone, urlSegura } from "@/dominio/formato";
import { categoriasFerramenta, statusFerramenta, tiposLink } from "@/dominio/rotulos";
import { Avatar, Botao, Carregando, Falha, Logo, Secao, Selo, Vazio } from "@/ui";
import { Modal } from "@/ui/Modal";
import {
  EnvioImagens,
  FormDados,
  FormFerramentas,
  FormIdentificacao,
  FormLinks,
  FormResponsaveis,
} from "./formularios";

type Edicao =
  "identificacao" | "dados" | "links" | "ferramentas" | "responsaveis" | "projeto" | null;

const titulos: Record<Exclude<Edicao, null>, string> = {
  identificacao: "Editar identificação",
  dados: "Editar dados da empresa",
  links: "Links e canais",
  ferramentas: "Sistemas e ferramentas",
  responsaveis: "Responsáveis",
  projeto: "Novo projeto",
};

function BotaoEditar({ aoClicar, rotulo = "Editar" }: { aoClicar: () => void; rotulo?: string }) {
  const pode = usePode("empresas.editar");
  if (!pode) return null;
  return (
    <Botao variante="fantasma" pequeno onClick={aoClicar}>
      <Pencil className="size-3.5" /> {rotulo}
    </Botao>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="text-sm break-words">
        {children || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

const fmtCnpj = (c?: string | null) =>
  c?.length === 14 ? c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : c;
const fmtCep = (c?: string | null) => (c?.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
const linkWhats = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;

function enderecoEmLinhas(e: TEmpresa["endereco"]) {
  if (!e) return null;
  const l1 = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(", ");
  const l2 = [e.bairro, [e.cidade, e.uf].filter(Boolean).join(" / "), fmtCep(e.cep)]
    .filter(Boolean)
    .join(" · ");
  return l1 || l2 ? (
    <>
      {l1}
      {l1 && l2 && <br />}
      {l2}
    </>
  ) : null;
}

function ItemLink({ link }: { link: LinkCanal }) {
  return (
    <li className={`flex items-center gap-3 py-2 ${link.ativo ? "" : "opacity-50"}`}>
      <Globe className="size-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {link.nome} {!link.ativo && <Selo tom="cinza">Inativo</Selo>}
        </p>
        <p className="text-xs text-slate-500">{tiposLink[link.tipo]}</p>
      </div>
      <a
        href={urlSegura(link.url)}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-marca ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
      >
        Abrir <ExternalLink className="size-3" />
      </a>
    </li>
  );
}

export function Empresa() {
  const { id = "" } = useParams();
  const consulta = useObterEmpresa(id);
  const projetos = useListarProjetos({ empresaId: id });
  const [edicao, setEdicao] = useState<Edicao>(null);
  const podeCriarProjeto = usePode("projetos.criar");
  const organizacao = useNomeOrganizacao();
  const fechar = () => setEdicao(null);

  if (consulta.isPending) return <Carregando />;
  if (consulta.isError) return <Falha erro={consulta.error} />;
  const e = consulta.data;

  return (
    <div className="space-y-5">
      <nav className="text-sm text-slate-500">
        <Link to="/" className="hover:text-marca">
          {organizacao}
        </Link>{" "}
        ›{" "}
        <Link to="/empresas" className="hover:text-marca">
          Empresas
        </Link>{" "}
        › <span className="text-slate-800">{e.nome}</span>
      </nav>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className="h-28 bg-gradient-to-r from-slate-800 to-slate-600 bg-cover bg-center sm:h-36"
          style={
            urlSegura(e.capaUrl)
              ? { backgroundImage: `url("${encodeURI(e.capaUrl!)}")` }
              : undefined
          }
        />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="-mt-14 sm:-mt-16">
            <Logo nome={e.nome} url={e.logoUrl} tamanho="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{e.nome}</h1>
              <SeloStatusEmpresa status={e.status} />
            </div>
            {e.slogan && <p className="text-sm text-slate-500 italic">{e.slogan}</p>}
            <p className="mt-1 text-xs text-slate-500">
              {[
                e.segmento,
                `${e.totalProjetos} projetos`,
                `${e.totalProjetosEmAndamento} em andamento`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <BotaoEditar aoClicar={() => setEdicao("identificacao")} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Secao titulo="Sobre a empresa">
            {e.descricaoCurta || e.descricao ? (
              <div className="space-y-2 text-sm">
                {e.descricaoCurta && <p className="font-medium">{e.descricaoCurta}</p>}
                {e.descricao && <p className="whitespace-pre-line text-slate-600">{e.descricao}</p>}
              </div>
            ) : (
              <Vazio>Conte o que a empresa faz em “Editar”, no topo.</Vazio>
            )}
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Dado rotulo="Nome fantasia">{e.nomeFantasia}</Dado>
              <Dado rotulo="Razão social">{e.razaoSocial}</Dado>
            </dl>
          </Secao>

          <Secao
            titulo="Projetos"
            acao={
              podeCriarProjeto && (
                <Botao pequeno onClick={() => setEdicao("projeto")}>
                  <Plus className="size-3.5" /> Novo projeto
                </Botao>
              )
            }
          >
            {projetos.isPending ? (
              <Carregando />
            ) : projetos.isError ? (
              <Falha erro={projetos.error} />
            ) : (
              <CartoesProjetos
                projetos={projetos.data.itens}
                vazio="Nenhum projeto ligado a esta empresa."
              />
            )}
          </Secao>

          <Secao
            titulo="Sistemas e ferramentas"
            acao={<BotaoEditar aoClicar={() => setEdicao("ferramentas")} />}
          >
            {e.ferramentas.length === 0 ? (
              <Vazio>Nenhuma ferramenta registrada.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {e.ferramentas.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {f.nome}{" "}
                        <span className="font-normal text-slate-500">
                          · {categoriasFerramenta[f.categoria]}
                        </span>
                      </p>
                      {f.descricao && <p className="text-sm text-slate-600">{f.descricao}</p>}
                      {f.observacao && <p className="text-xs text-slate-500">{f.observacao}</p>}
                    </div>
                    <Selo tom={statusFerramenta[f.status].tom}>
                      {statusFerramenta[f.status].rotulo}
                    </Selo>
                    {urlSegura(f.url) && (
                      <a
                        href={urlSegura(f.url)}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Abrir ${f.nome}`}
                        className="p-1 text-marca"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>

        <div className="space-y-5">
          <Secao
            titulo="Responsáveis"
            acao={<BotaoEditar aoClicar={() => setEdicao("responsaveis")} />}
          >
            {e.responsaveis.length === 0 ? (
              <Vazio>Ninguém vinculado.</Vazio>
            ) : (
              <ul className="space-y-2">
                {e.responsaveis.map((r) => (
                  <li key={r.ator.id + r.papel} className="flex items-center gap-2 text-sm">
                    <Avatar nome={r.ator.nome} />
                    <span className="flex-1">{r.ator.nome}</span>
                    <span className="text-xs text-slate-500">{r.papel}</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Links e canais" acao={<BotaoEditar aoClicar={() => setEdicao("links")} />}>
            {e.links.length === 0 ? (
              <Vazio>Nenhum link cadastrado.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {e.links.map((l, i) => (
                  <ItemLink key={i} link={l} />
                ))}
              </ul>
            )}
          </Secao>

          <Secao
            titulo="Dados da empresa"
            acao={<BotaoEditar aoClicar={() => setEdicao("dados")} />}
          >
            <dl className="space-y-3">
              <Dado rotulo="CNPJ">{fmtCnpj(e.cnpj)}</Dado>
              <Dado rotulo="Endereço">{enderecoEmLinhas(e.endereco)}</Dado>
              <Dado rotulo="Telefone">
                {e.telefone && <a href={`tel:${e.telefone}`}>{telefone(e.telefone)}</a>}
              </Dado>
              <Dado rotulo="WhatsApp">
                {e.whatsapp && (
                  <a
                    href={linkWhats(e.whatsapp)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-marca"
                  >
                    {telefone(e.whatsapp)}
                  </a>
                )}
              </Dado>
              <Dado rotulo="E-mail principal">
                {e.email && <a href={`mailto:${e.email}`}>{e.email}</a>}
              </Dado>
              {e.contatos.length > 0 && (
                <Dado rotulo="Outros contatos">
                  <ul className="mt-1 space-y-1.5">
                    {e.contatos.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.nome}</span>
                        {c.cargo && <span className="text-slate-500"> · {c.cargo}</span>}
                        <br />
                        <span className="text-xs text-slate-500">
                          {[c.email, c.telefone && telefone(c.telefone), c.observacao]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Dado>
              )}
              <Dado rotulo="Observações internas">
                {e.observacoes && <span className="whitespace-pre-line">{e.observacoes}</span>}
              </Dado>
            </dl>
          </Secao>
        </div>
      </div>

      <Modal
        titulo={edicao ? titulos[edicao] : ""}
        aberto={edicao !== null}
        aoFechar={fechar}
        largo={edicao !== "projeto"}
      >
        {edicao === "identificacao" && (
          <>
            <EnvioImagens empresa={e} />
            <FormIdentificacao empresa={e} aoConcluir={fechar} />
          </>
        )}
        {edicao === "dados" && <FormDados empresa={e} aoConcluir={fechar} />}
        {edicao === "links" && <FormLinks empresa={e} aoConcluir={fechar} />}
        {edicao === "ferramentas" && <FormFerramentas empresa={e} aoConcluir={fechar} />}
        {edicao === "responsaveis" && <FormResponsaveis empresa={e} aoConcluir={fechar} />}
        {edicao === "projeto" && <NovoProjeto empresaId={e.id} aoFechar={fechar} />}
      </Modal>
    </div>
  );
}
