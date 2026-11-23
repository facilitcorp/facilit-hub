import { Link } from "react-router";
import { clsx } from "clsx";
import type { Projeto } from "@/api/tipos";
import { dataCurta, diasAte, haQuanto, notaVelha } from "@/dominio/formato";
import { useJanelaPrazo } from "@/api/painel";
import { prazoProximo, projetoAberto } from "@/dominio/painel";
import { fasesProjeto, statusProjeto } from "@/dominio/rotulos";
import { Avatar, Progresso, Selo, Vazio } from "@/ui";

export function SeloStatusProjeto({ status }: { status: Projeto["status"] }) {
  const s = statusProjeto[status];
  return <Selo tom={s.tom}>{s.rotulo}</Selo>;
}

export function Prazo({ projeto }: { projeto: Projeto }) {
  const janela = useJanelaPrazo();
  if (!projeto.prazoPrevisto) return <span className="text-slate-400">—</span>;
  const dias = diasAte(projeto.prazoPrevisto);
  const aberto = projetoAberto(projeto);
  const proximo = janela !== undefined && prazoProximo(projeto, janela);
  return (
    <span
      className={clsx(
        aberto && dias < 0 && "font-medium text-red-600",
        proximo && dias >= 0 && "font-medium text-amber-700",
      )}
      title={aberto && dias < 0 ? `Atrasado ${-dias} dia(s)` : undefined}
    >
      {dataCurta(projeto.prazoPrevisto)}
    </span>
  );
}

export function UltimaNota({ projeto, completa }: { projeto: Projeto; completa?: boolean }) {
  const n = projeto.ultimaAtualizacao;
  const velha = projetoAberto(projeto) && notaVelha(n?.em);
  if (!n)
    return (
      <span className={clsx("text-xs", velha ? "text-amber-700" : "text-slate-400")}>
        Sem atualização
      </span>
    );
  return (
    <div className="min-w-0">
      <p className={clsx("text-sm text-slate-700", !completa && "line-clamp-1")}>{n.texto}</p>
      <p className={clsx("text-xs", velha ? "font-medium text-amber-700" : "text-slate-500")}>
        {n.autor?.nome ?? "—"} · {haQuanto(n.em)}
      </p>
    </div>
  );
}

export function Responsavel({ projeto }: { projeto: Projeto }) {
  if (!projeto.responsavel) return <span className="text-slate-400">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <Avatar nome={projeto.responsavel.nome} />
      <span className="truncate">{projeto.responsavel.nome}</span>
    </span>
  );
}

const faseRotulo = Object.fromEntries(fasesProjeto.map((f) => [f.valor, f.rotulo]));

/** Tabela de projetos; vira lista de cartões no celular. */
export function TabelaProjetos({
  projetos,
  semEmpresa,
  comFase,
  vazio = "Nenhum projeto.",
}: {
  projetos: Projeto[];
  semEmpresa?: boolean;
  comFase?: boolean;
  vazio?: string;
}) {
  if (projetos.length === 0) return <Vazio>{vazio}</Vazio>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-3 font-medium">Projeto</th>
              {!semEmpresa && <th className="py-2 pr-3 font-medium">Empresa</th>}
              <th className="py-2 pr-3 font-medium">Status</th>
              {comFase && <th className="py-2 pr-3 font-medium">Fase</th>}
              <th className="w-36 py-2 pr-3 font-medium">Progresso</th>
              <th className="py-2 pr-3 font-medium">Responsável</th>
              <th className="py-2 pr-3 font-medium">Prazo</th>
              <th className="py-2 font-medium">Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {projetos.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="py-3 pr-3">
                  <Link to={`/projetos/${p.id}`} className="font-medium hover:text-marca">
                    {p.nome}
                  </Link>
                  {semEmpresa && p.descricao && (
                    <p className="line-clamp-1 text-xs text-slate-500">{p.descricao}</p>
                  )}
                </td>
                {!semEmpresa && (
                  <td className="py-3 pr-3">
                    <Link
                      to={`/empresas/${p.empresa.id}`}
                      className="text-slate-600 hover:text-marca"
                    >
                      {p.empresa.nome}
                    </Link>
                  </td>
                )}
                <td className="py-3 pr-3">
                  <SeloStatusProjeto status={p.status} />
                </td>
                {comFase && <td className="py-3 pr-3 text-slate-600">{faseRotulo[p.fase]}</td>}
                <td className="py-3 pr-3">
                  <Progresso valor={p.progresso} compacto />
                </td>
                <td className="py-3 pr-3">
                  <Responsavel projeto={p} />
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  <Prazo projeto={p} />
                </td>
                <td className="max-w-64 py-3">
                  <UltimaNota projeto={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {projetos.map((p) => (
          <li key={p.id}>
            <CartaoProjeto projeto={p} semEmpresa={semEmpresa} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function CartaoProjeto({
  projeto: p,
  semEmpresa,
}: {
  projeto: Projeto;
  semEmpresa?: boolean;
}) {
  return (
    <Link
      to={`/projetos/${p.id}`}
      className="block h-full rounded-lg border border-slate-200 p-3 transition hover:border-marca/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{p.nome}</p>
          <p className="text-xs text-slate-500">
            {semEmpresa ? faseRotulo[p.fase] : `${p.empresa.nome} · ${faseRotulo[p.fase]}`}
          </p>
        </div>
        <SeloStatusProjeto status={p.status} />
      </div>
      {p.descricao && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.descricao}</p>}
      <div className="my-2">
        <Progresso valor={p.progresso} compacto />
      </div>
      <div className="mb-2 flex justify-between gap-2 text-xs text-slate-600">
        <Responsavel projeto={p} />
        <Prazo projeto={p} />
      </div>
      <UltimaNota projeto={p} />
    </Link>
  );
}

export function CartoesProjetos({ projetos, vazio }: { projetos: Projeto[]; vazio: string }) {
  if (projetos.length === 0) return <Vazio>{vazio}</Vazio>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projetos.map((p) => (
        <li key={p.id}>
          <CartaoProjeto projeto={p} semEmpresa />
        </li>
      ))}
    </ul>
  );
}
