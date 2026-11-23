import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useListarAtores } from "@/api/empresas";
import { useAtualizarDocumento, useCriarDocumento } from "@/api/documentos";
import { useAtualizarProjeto, useRegistrarAtualizacaoProjeto } from "@/api/projetos";
import type { Documento, Projeto, TipoDocumento } from "@/api/tipos";
import { textoOpc, urlObrig, v } from "@/dominio/formulario";
import {
  fasesProjeto,
  opcoes,
  prioridades,
  statusProjeto,
  tiposDocumento,
} from "@/dominio/rotulos";
import { AreaTexto, Botao, Campo, Entrada, MensagemErro, Selecao } from "@/ui";

interface Props {
  projeto: Projeto;
  aoConcluir: () => void;
}

const dataOpc = z.string().transform((x) => (x === "" ? null : x));

const esquema = z
  .object({
    nome: z.string().trim().min(2, "Mínimo de 2 caracteres").max(120),
    descricao: textoOpc(2000),
    objetivo: textoOpc(2000),
    responsavelId: z.string().transform((x) => (x === "" ? null : x)),
    prioridade: z.enum(["baixa", "media", "alta", "critica"]),
    status: z.enum([
      "nao_iniciado",
      "em_andamento",
      "bloqueado",
      "pausado",
      "concluido",
      "cancelado",
    ]),
    fase: z.enum(["descoberta", "planejamento", "execucao", "validacao", "entrega"]),
    progresso: z.coerce.number<string | number>().int().min(0).max(100),
    inicioPrevisto: dataOpc,
    prazoPrevisto: dataOpc,
    proximaAcao: textoOpc(500),
  })
  .refine((d) => !d.inicioPrevisto || !d.prazoPrevisto || d.inicioPrevisto <= d.prazoPrevisto, {
    path: ["prazoPrevisto"],
    message: "O prazo não pode ser antes do início",
  });

export function FormProjeto({ projeto: p, aoConcluir }: Props) {
  const m = useAtualizarProjeto(p.id);
  const atores = useListarAtores();
  const form = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: p.nome,
      descricao: v(p.descricao),
      objetivo: v(p.objetivo),
      responsavelId: p.responsavel?.id ?? "",
      prioridade: p.prioridade,
      status: p.status,
      fase: p.fase,
      progresso: p.progresso,
      inicioPrevisto: v(p.inicioPrevisto),
      prazoPrevisto: v(p.prazoPrevisto),
      proximaAcao: v(p.proximaAcao),
    },
  });
  const err = form.formState.errors;
  const progresso = useWatch({ control: form.control, name: "progresso" });
  return (
    <form
      onSubmit={form.handleSubmit((d) =>
        m.mutate({ ...d, versao: p.versao }, { onSuccess: aoConcluir }),
      )}
      className="grid gap-4 sm:grid-cols-3"
    >
      <Campo rotulo="Nome" erro={err.nome?.message} className="sm:col-span-3">
        <Entrada {...form.register("nome")} />
      </Campo>
      <Campo rotulo="Próxima ação" erro={err.proximaAcao?.message} className="sm:col-span-3">
        <Entrada
          placeholder="Ex.: Finalizar integração do formulário."
          {...form.register("proximaAcao")}
        />
      </Campo>
      <Campo rotulo="Status">
        <Selecao {...form.register("status")}>
          {opcoes(statusProjeto).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Fase">
        <Selecao {...form.register("fase")}>
          {fasesProjeto.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
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
      <Campo
        rotulo={`Progresso: ${progresso}%`}
        erro={err.progresso?.message}
        className="sm:col-span-3"
      >
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          className="w-full accent-marca"
          {...form.register("progresso")}
        />
      </Campo>
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
      <Campo rotulo="Início previsto">
        <Entrada type="date" {...form.register("inicioPrevisto")} />
      </Campo>
      <Campo rotulo="Prazo previsto" erro={err.prazoPrevisto?.message}>
        <Entrada type="date" {...form.register("prazoPrevisto")} />
      </Campo>
      <Campo rotulo="Descrição" erro={err.descricao?.message} className="sm:col-span-3">
        <AreaTexto {...form.register("descricao")} />
      </Campo>
      <Campo rotulo="Objetivo" erro={err.objetivo?.message} className="sm:col-span-3">
        <AreaTexto {...form.register("objetivo")} />
      </Campo>
      <div className="space-y-3 sm:col-span-3">
        <MensagemErro erro={m.error} />
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={aoConcluir}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={m.isPending}>
            {m.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </div>
      </div>
    </form>
  );
}

const esquemaDoc = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(160),
  tipo: z.enum(Object.keys(tiposDocumento) as [TipoDocumento]),
  url: urlObrig,
  observacao: textoOpc(1000),
});

/** Cria (sem `documento`) ou edita um documento/link do projeto. */
export function FormDocumento({
  projetoId,
  documento,
  aoConcluir,
}: {
  projetoId: string;
  documento?: Documento;
  aoConcluir: () => void;
}) {
  const criar = useCriarDocumento();
  const atualizar = useAtualizarDocumento(documento?.id ?? "");
  const m = documento ? atualizar : criar;
  const form = useForm({
    resolver: zodResolver(esquemaDoc),
    defaultValues: {
      nome: documento?.nome ?? "",
      tipo: documento?.tipo ?? "outro",
      url: documento?.url ?? "",
      observacao: v(documento?.observacao),
    },
  });
  const err = form.formState.errors;
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((d) =>
        documento
          ? atualizar.mutate({ ...d, versao: documento.versao }, { onSuccess: aoConcluir })
          : criar.mutate({ ...d, projetoId }, { onSuccess: aoConcluir }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Campo rotulo="Nome" erro={err.nome?.message}>
          <Entrada autoFocus {...form.register("nome")} />
        </Campo>
        <Campo rotulo="Tipo">
          <Selecao {...form.register("tipo")}>
            {opcoes(tiposDocumento).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <Campo rotulo="URL" erro={err.url?.message}>
        <Entrada placeholder="https://" {...form.register("url")} />
      </Campo>
      <Campo rotulo="Observação" erro={err.observacao?.message}>
        <Entrada {...form.register("observacao")} />
      </Campo>
      <MensagemErro erro={m.error} />
      <div className="flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoConcluir}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={m.isPending}>
          Salvar
        </Botao>
      </div>
    </form>
  );
}

const esquemaNota = z.object({
  texto: z.string().trim().min(3, "Escreva a atualização").max(2000),
});

export function FormAtualizacao({ projetoId }: { projetoId: string }) {
  const m = useRegistrarAtualizacaoProjeto(projetoId);
  const form = useForm({ resolver: zodResolver(esquemaNota), defaultValues: { texto: "" } });
  return (
    <form
      className="space-y-2"
      onSubmit={form.handleSubmit(({ texto }) =>
        m.mutate(texto, { onSuccess: () => form.reset() }),
      )}
    >
      <AreaTexto
        aria-label="Nova atualização"
        placeholder="Ex.: Finalizamos o layout e agora estamos iniciando integração."
        {...form.register("texto")}
      />
      {form.formState.errors.texto && (
        <p className="text-xs text-red-600">{form.formState.errors.texto.message}</p>
      )}
      <MensagemErro erro={m.error} />
      <div className="flex justify-end">
        <Botao type="submit" disabled={m.isPending}>
          {m.isPending ? "Registrando…" : "Registrar atualização"}
        </Botao>
      </div>
    </form>
  );
}
