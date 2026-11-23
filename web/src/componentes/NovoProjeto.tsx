import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { useListarAtores, useListarEmpresas } from "@/api/empresas";
import { useCriarProjeto } from "@/api/projetos";
import { opcoes, prioridades } from "@/dominio/rotulos";
import { AreaTexto, Botao, Campo, Entrada, MensagemErro, Selecao } from "@/ui";

const vazioParaUndef = (x: string) => (x === "" ? undefined : x);

const esquema = z.object({
  empresaId: z.string().min(1, "Escolha a empresa"),
  nome: z.string().trim().min(2, "Mínimo de 2 caracteres").max(120),
  descricao: z.string().trim().max(500).transform(vazioParaUndef),
  responsavelId: z.string().transform(vazioParaUndef),
  prioridade: z.enum(["baixa", "media", "alta", "critica"]),
  prazoPrevisto: z.string().transform(vazioParaUndef),
});

export function NovoProjeto({ empresaId, aoFechar }: { empresaId?: string; aoFechar: () => void }) {
  const criar = useCriarProjeto();
  const empresas = useListarEmpresas();
  const atores = useListarAtores();
  const navegar = useNavigate();
  const form = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      empresaId: empresaId ?? "",
      nome: "",
      descricao: "",
      responsavelId: "",
      prioridade: "media" as const,
      prazoPrevisto: "",
    },
  });
  const err = form.formState.errors;
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((d) =>
        criar.mutate(d, { onSuccess: (p) => navegar(`/projetos/${p.id}`) }),
      )}
    >
      {!empresaId && (
        <Campo rotulo="Empresa" erro={err.empresaId?.message}>
          <Selecao {...form.register("empresaId")}>
            <option value="">Escolha…</option>
            {empresas.data?.itens.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      )}
      <Campo rotulo="Nome do projeto" erro={err.nome?.message}>
        <Entrada autoFocus {...form.register("nome")} />
      </Campo>
      <Campo rotulo="Descrição curta">
        <AreaTexto rows={2} {...form.register("descricao")} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Responsável">
          <Selecao {...form.register("responsavelId")}>
            <option value="">—</option>
            {atores.data?.itens.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Prioridade">
          <Selecao {...form.register("prioridade")}>
            {opcoes(prioridades).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Prazo previsto">
          <Entrada type="date" {...form.register("prazoPrevisto")} />
        </Campo>
      </div>
      <MensagemErro erro={criar.error} />
      <div className="flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={criar.isPending}>
          Criar projeto
        </Botao>
      </div>
    </form>
  );
}
