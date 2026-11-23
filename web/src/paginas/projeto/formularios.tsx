import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useListarAtores } from "@/api/empresas";
import { useAtualizarProjeto, useRegistrarAtualizacao } from "@/api/projetos";
import type { Projeto } from "@/api/tipos";
import { semNulos, textoOpc, urlObrig, v } from "@/dominio/formulario";
import { fasesProjeto, opcoes, prioridades, statusProjeto } from "@/dominio/rotulos";
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
    proximosPassos: textoOpc(500),
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
      proximosPassos: v(p.proximosPassos),
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
      <Campo rotulo="Próxima ação" erro={err.proximosPassos?.message} className="sm:col-span-3">
        <Entrada
          placeholder="Ex.: Finalizar integração do formulário."
          {...form.register("proximosPassos")}
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

const esquemaDocs = z.object({
  documentos: z
    .array(
      z.object({
        nome: z.string().trim().min(1, "Informe o nome").max(120),
        tipo: z.string().trim().min(1, "Informe o tipo").max(60),
        url: urlObrig,
        observacao: textoOpc(300),
      }),
    )
    .max(100),
});

export function FormDocumentos({ projeto: p, aoConcluir }: Props) {
  const m = useAtualizarProjeto(p.id);
  const form = useForm({
    resolver: zodResolver(esquemaDocs),
    defaultValues: { documentos: p.documentos.map((d) => ({ ...d, observacao: v(d.observacao) })) },
  });
  const itens = useFieldArray({ control: form.control, name: "documentos" });
  const err = form.formState.errors.documentos;
  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((d) =>
        m.mutate(
          { documentos: d.documentos.map(semNulos), versao: p.versao },
          { onSuccess: aoConcluir },
        ),
      )}
    >
      <datalist id="tipos-doc">
        {[
          "GitHub",
          "Figma",
          "Google Drive",
          "Site de homologação",
          "Documentação",
          "Apresentação",
        ].map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {itens.fields.map((f, i) => (
        <div
          key={f.id}
          className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_10rem_2fr]"
        >
          <Campo rotulo="Nome" erro={err?.[i]?.nome?.message}>
            <Entrada {...form.register(`documentos.${i}.nome`)} />
          </Campo>
          <Campo rotulo="Tipo" erro={err?.[i]?.tipo?.message}>
            <Entrada list="tipos-doc" {...form.register(`documentos.${i}.tipo`)} />
          </Campo>
          <Campo rotulo="URL" erro={err?.[i]?.url?.message}>
            <Entrada placeholder="https://" {...form.register(`documentos.${i}.url`)} />
          </Campo>
          <Campo rotulo="Observação" className="sm:col-span-2">
            <Entrada {...form.register(`documentos.${i}.observacao`)} />
          </Campo>
          <div className="flex items-end justify-end">
            <Botao variante="perigo" pequeno onClick={() => itens.remove(i)}>
              <Trash2 className="size-3.5" /> Remover
            </Botao>
          </div>
        </div>
      ))}
      <Botao
        variante="secundario"
        pequeno
        onClick={() => itens.append({ nome: "", tipo: "", url: "", observacao: "" })}
      >
        <Plus className="size-3.5" /> Adicionar link
      </Botao>
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
  const m = useRegistrarAtualizacao(projetoId);
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
