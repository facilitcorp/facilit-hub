import { Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useListarEmpresas } from "@/api/empresas";
import { useListarProjetos } from "@/api/projetos";
import type { StatusProjeto } from "@/api/tipos";
import { NovoProjeto } from "@/componentes/NovoProjeto";
import { TabelaProjetos } from "@/componentes/projetos";
import { opcoes, statusProjeto } from "@/dominio/rotulos";
import { Botao, Carregando, Cartao, Entrada, Falha, Selecao } from "@/ui";
import { Modal } from "@/ui/Modal";

export function Projetos() {
  const [params, setParams] = useSearchParams();
  const filtro = {
    empresaId: params.get("empresaId") ?? undefined,
    status: (params.get("status") as StatusProjeto | null) ?? undefined,
    busca: params.get("busca") ?? undefined,
  };
  const lista = useListarProjetos(filtro);
  const empresas = useListarEmpresas();
  const [criando, setCriando] = useState(false);

  const filtrar = (k: string, v: string) =>
    setParams(
      (p) => {
        if (v) p.set(k, v);
        else p.delete(k);
        return p;
      },
      { replace: true },
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Botao onClick={() => setCriando(true)}>
          <Plus className="size-4" /> Novo projeto
        </Botao>
      </div>
      <div className="flex flex-wrap gap-3">
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
        <Selecao
          aria-label="Filtrar por status"
          className="max-w-48"
          value={filtro.status ?? ""}
          onChange={(e) => filtrar("status", e.target.value)}
        >
          <option value="">Todos os status</option>
          {opcoes(statusProjeto).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </div>
      <Cartao className="p-4">
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <Falha erro={lista.error} />
        ) : (
          <TabelaProjetos projetos={lista.data.itens} comFase vazio="Nenhum projeto encontrado." />
        )}
      </Cartao>
      <Modal titulo="Novo projeto" aberto={criando} aoFechar={() => setCriando(false)}>
        <NovoProjeto aoFechar={() => setCriando(false)} />
      </Modal>
    </div>
  );
}
