import { Link } from "react-router";
import type { Empresa } from "@/api/tipos";
import { statusEmpresa } from "@/dominio/rotulos";
import { Cartao, Logo, Selo } from "@/ui";

export function SeloStatusEmpresa({ status }: { status: Empresa["status"] }) {
  const s = statusEmpresa[status];
  return <Selo tom={s.tom}>{s.rotulo}</Selo>;
}

export function CartaoEmpresa({ empresa }: { empresa: Empresa }) {
  return (
    <Link to={`/empresas/${empresa.id}`} className="group block">
      <Cartao className="h-full p-4 transition group-hover:border-marca/40 group-hover:shadow">
        <div className="flex items-start gap-3">
          <Logo nome={empresa.nome} url={empresa.logoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold group-hover:text-marca">{empresa.nome}</p>
            <div className="mt-1">
              <SeloStatusEmpresa status={empresa.status} />
            </div>
          </div>
        </div>
        {empresa.descricaoCurta && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{empresa.descricaoCurta}</p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {empresa.totalProjetos} {empresa.totalProjetos === 1 ? "projeto" : "projetos"} ·{" "}
          <span className="font-medium text-slate-700">
            {empresa.totalProjetosEmAndamento} em andamento
          </span>
        </p>
      </Cartao>
    </Link>
  );
}
