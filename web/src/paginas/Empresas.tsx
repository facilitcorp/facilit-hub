import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { textoOpc } from "@/dominio/formulario";
import { useCriarEmpresa, useListarEmpresas } from "@/api/empresas";
import { usePode } from "@/api/sessao";
import type { StatusEmpresa } from "@/api/tipos";
import { CartaoEmpresa } from "@/componentes/empresas";
import { opcoes, statusEmpresa } from "@/dominio/rotulos";
import { Botao, Campo, Carregando, Entrada, Falha, MensagemErro, Selecao, Vazio } from "@/ui";
import { Modal } from "@/ui/Modal";

const esquema = z.object({
  nome: z.string().trim().min(2, "Mínimo de 2 caracteres").max(160),
  segmento: textoOpc(120),
  descricaoCurta: textoOpc(280),
});

function NovaEmpresa({ aoFechar }: { aoFechar: () => void }) {
  const criar = useCriarEmpresa();
  const navegar = useNavigate();
  const form = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nome: "", segmento: "", descricaoCurta: "" },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((d) =>
        criar.mutate(d, { onSuccess: (e) => navegar(`/empresas/${e.id}`) }),
      )}
    >
      <Campo rotulo="Nome" erro={form.formState.errors.nome?.message}>
        <Entrada autoFocus {...form.register("nome")} />
      </Campo>
      <Campo rotulo="Segmento">
        <Entrada placeholder="Ex.: Tecnologia" {...form.register("segmento")} />
      </Campo>
      <Campo rotulo="O que a empresa faz (descrição curta)">
        <Entrada {...form.register("descricaoCurta")} />
      </Campo>
      <p className="text-xs text-slate-500">A empresa começa com o status “Em estruturação”.</p>
      <MensagemErro erro={criar.error} />
      <div className="flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={criar.isPending}>
          Criar empresa
        </Botao>
      </div>
    </form>
  );
}

export function Empresas() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as StatusEmpresa | null) ?? undefined;
  const busca = params.get("busca") ?? "";
  const lista = useListarEmpresas({
    status: status ? [status] : undefined,
    busca: busca || undefined,
  });
  const [criando, setCriando] = useState(false);
  const podeCriar = usePode("empresas.criar");

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
        <h1 className="text-2xl font-bold">Empresas</h1>
        {podeCriar && (
          <Botao onClick={() => setCriando(true)}>
            <Plus className="size-4" /> Nova empresa
          </Botao>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Entrada
          aria-label="Buscar empresa"
          placeholder="Buscar por nome"
          className="max-w-xs"
          value={busca}
          onChange={(e) => filtrar("busca", e.target.value)}
        />
        <Selecao
          aria-label="Filtrar por status"
          className="max-w-48"
          value={status ?? ""}
          onChange={(e) => filtrar("status", e.target.value)}
        >
          <option value="">Todos os status</option>
          {opcoes(statusEmpresa).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </div>
      {lista.isPending ? (
        <Carregando />
      ) : lista.isError ? (
        <Falha erro={lista.error} />
      ) : lista.data.itens.length === 0 ? (
        <Vazio>Nenhuma empresa encontrada.</Vazio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.data.itens.map((e) => (
            <CartaoEmpresa key={e.id} empresa={e} />
          ))}
        </div>
      )}
      <Modal titulo="Nova empresa" aberto={criando} aoFechar={() => setCriando(false)}>
        <NovaEmpresa aoFechar={() => setCriando(false)} />
      </Modal>
    </div>
  );
}
