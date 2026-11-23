import { useListarEmpresas } from "@/api/empresas";
import { useListarProjetos } from "@/api/projetos";
import { CartaoEmpresa } from "@/componentes/empresas";
import { TabelaProjetos } from "@/componentes/projetos";
import { resumoDoGrupo } from "@/dominio/painel";
import { Cartao, Carregando, Falha, Secao, Vazio } from "@/ui";

function Indicador({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <Cartao className="p-4">
      <p className="text-xs text-slate-500" data-indicador={rotulo}>
        {rotulo}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${destaque && valor > 0 ? "text-red-600" : ""}`}
      >
        {valor}
      </p>
    </Cartao>
  );
}

export function Hoje() {
  const empresas = useListarEmpresas();
  const projetos = useListarProjetos();

  if (empresas.isPending || projetos.isPending) return <Carregando />;
  if (empresas.isError) return <Falha erro={empresas.error} />;
  if (projetos.isError) return <Falha erro={projetos.error} />;

  const r = resumoDoGrupo(projetos.data.itens);
  const emAndamento = projetos.data.itens.filter(
    (p) => p.status === "em_andamento" || p.status === "bloqueado",
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hoje na Facilitcorp</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador rotulo="Empresas" valor={empresas.data.total} />
        <Indicador rotulo="Projetos ativos" valor={r.ativos} />
        <Indicador rotulo="Projetos bloqueados" valor={r.bloqueados} destaque />
        <Indicador rotulo="Próximos do prazo" valor={r.proximosDoPrazo} />
        <Indicador rotulo="Concluídos (30 dias)" valor={r.concluidosRecentes} />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">Empresas</h2>
        {empresas.data.itens.length === 0 ? (
          <Vazio>Nenhuma empresa cadastrada.</Vazio>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {empresas.data.itens.map((e) => (
              <CartaoEmpresa key={e.id} empresa={e} />
            ))}
          </div>
        )}
      </section>

      <Secao titulo="Projetos em andamento">
        <TabelaProjetos projetos={emAndamento} vazio="Nenhum projeto em andamento." />
      </Secao>
    </div>
  );
}
