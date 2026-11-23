import { ExternalLink } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useListarDocumentos } from "@/api/documentos";
import { useListarEmpresas } from "@/api/empresas";
import type { TipoDocumento } from "@/api/tipos";
import { urlSegura } from "@/dominio/formato";
import { opcoes, tiposDocumento } from "@/dominio/rotulos";
import { Cartao, Carregando, Entrada, Falha, Selecao, Vazio } from "@/ui";

/** Documentos e links de todos os projetos (MVP: só links). Cadastro fica no projeto. */
export function Documentos() {
  const [params, setParams] = useSearchParams();
  const filtro = {
    empresaId: params.get("empresaId") ?? undefined,
    tipo: (params.get("tipo") as TipoDocumento | null) ?? undefined,
    busca: params.get("busca") || undefined,
  };
  const docs = useListarDocumentos(filtro);
  const empresas = useListarEmpresas();
  const filtrar = (k: string, v: string) =>
    setParams(
      (p) => {
        p.delete(k);
        if (v) p.set(k, v);
        return p;
      },
      { replace: true },
    );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Documentos</h1>
      <div className="flex flex-wrap gap-3">
        <Entrada
          aria-label="Buscar documento"
          placeholder="Buscar por nome"
          className="max-w-xs"
          value={filtro.busca ?? ""}
          onChange={(e) => filtrar("busca", e.target.value)}
        />
        <Selecao
          aria-label="Filtrar por empresa"
          className="max-w-56"
          value={filtro.empresaId ?? ""}
          onChange={(e) => filtrar("empresaId", e.target.value)}
        >
          <option value="">Todas as empresas</option>
          {empresas.data?.itens.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Selecao>
        <Selecao
          aria-label="Filtrar por tipo"
          className="max-w-56"
          value={filtro.tipo ?? ""}
          onChange={(e) => filtrar("tipo", e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {opcoes(tiposDocumento).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </div>
      <Cartao className="p-4">
        {docs.isPending ? (
          <Carregando />
        ) : docs.isError ? (
          <Falha erro={docs.error} />
        ) : docs.data.itens.length === 0 ? (
          <Vazio>
            Nenhum documento ou link encontrado. Eles são cadastrados dentro de cada projeto.
          </Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.data.itens.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {tiposDocumento[d.tipo]} ·{" "}
                    <Link to={`/projetos/${d.projeto.id}`} className="hover:text-marca">
                      {d.projeto.nome}
                    </Link>{" "}
                    · {d.empresa.nome}
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
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
