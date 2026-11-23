import { Link } from "react-router";
import { useListarEmpresas } from "@/api/empresas";
import { useObterPainel } from "@/api/painel";
import { useListarProjetos } from "@/api/projetos";
import { CartaoEmpresa } from "@/componentes/empresas";
import { TabelaProjetos } from "@/componentes/projetos";
import { filtrosDoPainel } from "@/dominio/painel";
import { Cartao, Carregando, Falha, Secao, Vazio } from "@/ui";

function Indicador({
  rotulo,
  valor,
  para,
  destaque,
}: {
  rotulo: string;
  valor: number;
  para: string;
  destaque?: boolean;
}) {
  return (
    <Link to={para} className="group block">
      <Cartao className="h-full p-4 transition group-hover:border-marca/40">
        <p className="text-xs text-slate-500" data-indicador={rotulo}>
          {rotulo}
        </p>
        <p
          className={`mt-1 text-2xl font-semibold tabular-nums ${destaque && valor > 0 ? "text-red-600" : ""}`}
        >
          {valor}
        </p>
      </Cartao>
    </Link>
  );
}

export function Hoje() {
  const painel = useObterPainel();
  const empresas = useListarEmpresas();
  const projetos = useListarProjetos({
    status: ["em_andamento", "bloqueado"],
    ordem: "prazoPrevisto",
  });

  if (painel.isPending || empresas.isPending || projetos.isPending) return <Carregando />;
  const erro = painel.error ?? empresas.error ?? projetos.error;
  if (erro) return <Falha erro={erro} />;
  if (!painel.data || !empresas.data || !projetos.data) return null;

  const n = painel.data;
  const links = filtrosDoPainel(n.janelaPrazoDias, n.janelaConcluidosDias);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hoje na Facilitcorp</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador rotulo="Empresas" valor={n.totalEmpresas} para="/empresas" />
        <Indicador rotulo="Projetos ativos" valor={n.projetosAtivos} para={links.ativos} />
        <Indicador
          rotulo="Projetos bloqueados"
          valor={n.projetosBloqueados}
          para={links.bloqueados}
          destaque
        />
        <Indicador
          rotulo={`Prazo em até ${n.janelaPrazoDias} dias`}
          valor={n.projetosProximosDoPrazo}
          para={links.proximosDoPrazo}
        />
        <Indicador
          rotulo={`Concluídos (${n.janelaConcluidosDias} dias)`}
          valor={n.projetosConcluidosRecentemente}
          para={links.concluidosRecentes}
        />
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
        <TabelaProjetos projetos={projetos.data.itens} vazio="Nenhum projeto em andamento." />
      </Secao>
    </div>
  );
}
