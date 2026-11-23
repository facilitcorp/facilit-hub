import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { useListarProjetos } from "@/api/projetos";
import { urlSegura } from "@/dominio/formato";
import { Cartao, Carregando, Falha, Vazio } from "@/ui";

/** Visão única dos links registrados nos projetos (P8: só links, sem upload). */
export function Documentos() {
  const projetos = useListarProjetos();
  if (projetos.isPending) return <Carregando />;
  if (projetos.isError) return <Falha erro={projetos.error} />;
  const docs = projetos.data.itens.flatMap((p) => p.documentos.map((d) => ({ ...d, projeto: p })));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Documentos</h1>
      <Cartao className="p-4">
        {docs.length === 0 ? (
          <Vazio>Nenhum documento ou link registrado nos projetos.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((d, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {d.tipo} ·{" "}
                    <Link to={`/projetos/${d.projeto.id}`} className="hover:text-marca">
                      {d.projeto.nome}
                    </Link>{" "}
                    · {d.projeto.empresa.nome}
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
