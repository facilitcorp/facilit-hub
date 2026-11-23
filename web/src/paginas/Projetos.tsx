import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useListarEmpresas } from "@/api/empresas";
import { useListarProjetos } from "@/api/projetos";
import { usePode } from "@/api/sessao";
import type { StatusProjeto } from "@/api/tipos";
import { NovoProjeto } from "@/componentes/NovoProjeto";
import { TabelaProjetos } from "@/componentes/projetos";
import { dataCurta } from "@/dominio/formato";
import { opcoes, statusProjeto } from "@/dominio/rotulos";
import { Botao, Carregando, Cartao, Entrada, Falha, Selecao } from "@/ui";
import { Modal } from "@/ui/Modal";

export function Projetos() {
  const [params, setParams] = useSearchParams();
  const status = params.getAll("status") as StatusProjeto[];
  const prazoAte = params.get("prazoAte") ?? undefined;
  const concluidoDesde = params.get("concluidoDesde") ?? undefined;
  const filtro = {
    empresaId: params.get("empresaId") ?? undefined,
    status: status.length ? status : undefined,
    busca: params.get("busca") || undefined,
    prazoAte,
    concluidoDesde,
    ordem: prazoAte ? ("prazoPrevisto" as const) : undefined,
  };
  const lista = useListarProjetos(filtro);
  const empresas = useListarEmpresas();
  const podeCriar = usePode("projetos.criar");
  const [criando, setCriando] = useState(false);

  const filtrar = (k: string, v: string) =>
    setParams(
      (p) => {
        p.delete(k);
        if (v) p.set(k, v);
        return p;
      },
      { replace: true },
    );
  const limparJanela = () =>
    setParams(
      (p) => {
        p.delete("prazoAte");
        p.delete("concluidoDesde");
        p.delete("status");
        return p;
      },
      { replace: true },
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projetos</h1>
        {podeCriar && (
          <Botao onClick={() => setCriando(true)}>
            <Plus className="size-4" /> Novo projeto
          </Botao>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Entrada
          aria-label="Buscar projeto"
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
        {status.length <= 1 && (
          <Selecao
            aria-label="Filtrar por status"
            className="max-w-48"
            value={status[0] ?? ""}
            onChange={(e) => filtrar("status", e.target.value)}
          >
            <option value="">Todos os status</option>
            {opcoes(statusProjeto).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Selecao>
        )}
        {(prazoAte || concluidoDesde || status.length > 1) && (
          <Botao variante="secundario" pequeno onClick={limparJanela}>
            {prazoAte
              ? `Abertos com prazo até ${dataCurta(prazoAte)}`
              : concluidoDesde
                ? `Concluídos desde ${dataCurta(concluidoDesde)}`
                : "Vários status"}
            <X className="size-3.5" />
          </Botao>
        )}
      </div>
      <Cartao className="p-4">
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <Falha erro={lista.error} />
        ) : (
          <>
            <TabelaProjetos
              projetos={lista.data.itens}
              comFase
              vazio="Nenhum projeto encontrado."
            />
            {lista.data.proximoCursor && (
              <p className="mt-3 text-xs text-slate-500">
                Mostrando os primeiros {lista.data.itens.length}. Use os filtros para refinar.
              </p>
            )}
          </>
        )}
      </Cartao>
      <Modal titulo="Novo projeto" aberto={criando} aoFechar={() => setCriando(false)}>
        <NovoProjeto aoFechar={() => setCriando(false)} />
      </Modal>
    </div>
  );
}
