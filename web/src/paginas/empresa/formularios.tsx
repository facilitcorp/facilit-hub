import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useAtualizarEmpresa, useListarAtores } from "@/api/empresas";
import type { AtualizacaoEmpresa, Empresa } from "@/api/tipos";
import {
  digitosOpc,
  emailOpc,
  semNulos,
  telefoneOpc,
  textoOpc,
  urlObrig,
  urlOpc,
  v,
} from "@/dominio/formulario";
import {
  categoriasFerramenta,
  opcoes,
  statusEmpresa,
  statusFerramenta,
  tiposLink,
} from "@/dominio/rotulos";
import { AreaTexto, Botao, Campo, Entrada, MensagemErro, Selecao } from "@/ui";

interface Props {
  empresa: Empresa;
  aoConcluir: () => void;
}

function useSalvar({ empresa, aoConcluir }: Props) {
  const m = useAtualizarEmpresa(empresa.id);
  return {
    salvar: (dados: Omit<AtualizacaoEmpresa, "versao">) =>
      m.mutate({ ...dados, versao: empresa.versao }, { onSuccess: aoConcluir }),
    pendente: m.isPending,
    erro: m.error,
  };
}

function Rodape({
  pendente,
  erro,
  aoCancelar,
}: {
  pendente: boolean;
  erro: unknown;
  aoCancelar: () => void;
}) {
  return (
    <div className="space-y-3 pt-2">
      <MensagemErro erro={erro} />
      <div className="flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Botao>
      </div>
    </div>
  );
}

const esquemaIdentificacao = z.object({
  nome: z.string().trim().min(2, "Mínimo de 2 caracteres").max(120),
  nomeFantasia: textoOpc(120),
  razaoSocial: textoOpc(200),
  segmento: textoOpc(80),
  status: z.enum(["em_estruturacao", "ativa", "pausada", "inativa"]),
  slogan: textoOpc(160),
  descricaoCurta: textoOpc(200),
  descricaoCompleta: textoOpc(5000),
  logoUrl: urlOpc,
  capaUrl: urlOpc,
});

export function FormIdentificacao(props: Props) {
  const { empresa: e } = props;
  const { salvar, pendente, erro } = useSalvar(props);
  const form = useForm({
    resolver: zodResolver(esquemaIdentificacao),
    defaultValues: {
      nome: e.nome,
      nomeFantasia: v(e.nomeFantasia),
      razaoSocial: v(e.razaoSocial),
      segmento: v(e.segmento),
      status: e.status,
      slogan: v(e.slogan),
      descricaoCurta: v(e.descricaoCurta),
      descricaoCompleta: v(e.descricaoCompleta),
      logoUrl: v(e.logoUrl),
      capaUrl: v(e.capaUrl),
    },
  });
  const err = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(salvar)} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome" erro={err.nome?.message}>
        <Entrada {...form.register("nome")} />
      </Campo>
      <Campo rotulo="Nome fantasia" erro={err.nomeFantasia?.message}>
        <Entrada {...form.register("nomeFantasia")} />
      </Campo>
      <Campo rotulo="Razão social" erro={err.razaoSocial?.message}>
        <Entrada {...form.register("razaoSocial")} />
      </Campo>
      <Campo rotulo="Segmento" erro={err.segmento?.message}>
        <Entrada {...form.register("segmento")} />
      </Campo>
      <Campo rotulo="Status">
        <Selecao {...form.register("status")}>
          {opcoes(statusEmpresa).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Slogan" erro={err.slogan?.message}>
        <Entrada {...form.register("slogan")} />
      </Campo>
      <Campo rotulo="Descrição curta" erro={err.descricaoCurta?.message} className="sm:col-span-2">
        <Entrada {...form.register("descricaoCurta")} />
      </Campo>
      <Campo
        rotulo="Descrição completa"
        erro={err.descricaoCompleta?.message}
        className="sm:col-span-2"
      >
        <AreaTexto rows={5} {...form.register("descricaoCompleta")} />
      </Campo>
      <Campo rotulo="Endereço da logo (URL)" erro={err.logoUrl?.message}>
        <Entrada placeholder="https://" {...form.register("logoUrl")} />
      </Campo>
      <Campo rotulo="Endereço da capa (URL)" erro={err.capaUrl?.message}>
        <Entrada placeholder="https://" {...form.register("capaUrl")} />
      </Campo>
      <div className="sm:col-span-2">
        <Rodape pendente={pendente} erro={erro} aoCancelar={props.aoConcluir} />
      </div>
    </form>
  );
}

const esquemaDados = z.object({
  cnpj: digitosOpc(14, "O CNPJ tem 14 dígitos"),
  telefone: telefoneOpc,
  whatsapp: telefoneOpc,
  email: emailOpc,
  endereco: z.object({
    logradouro: textoOpc(200),
    numero: textoOpc(20),
    complemento: textoOpc(100),
    bairro: textoOpc(100),
    cidade: textoOpc(100),
    uf: textoOpc(2),
    cep: digitosOpc(8, "O CEP tem 8 dígitos"),
  }),
  observacoes: textoOpc(5000),
  contatos: z
    .array(
      z.object({
        nome: z.string().trim().min(1, "Informe o nome").max(120),
        cargo: textoOpc(80),
        email: emailOpc,
        telefone: telefoneOpc,
        observacao: textoOpc(500),
      }),
    )
    .max(30, "Máximo de 30 contatos"),
});

export function FormDados(props: Props) {
  const { empresa: e } = props;
  const { salvar, pendente, erro } = useSalvar(props);
  const end = e.endereco ?? {};
  const form = useForm({
    resolver: zodResolver(esquemaDados),
    defaultValues: {
      cnpj: v(e.cnpj),
      telefone: v(e.telefone),
      whatsapp: v(e.whatsapp),
      email: v(e.email),
      endereco: {
        logradouro: v(end.logradouro),
        numero: v(end.numero),
        complemento: v(end.complemento),
        bairro: v(end.bairro),
        cidade: v(end.cidade),
        uf: v(end.uf),
        cep: v(end.cep),
      },
      observacoes: v(e.observacoes),
      contatos: e.contatos.map((c) => ({
        nome: c.nome,
        cargo: v(c.cargo),
        email: v(c.email),
        telefone: v(c.telefone),
        observacao: v(c.observacao),
      })),
    },
  });
  const contatos = useFieldArray({ control: form.control, name: "contatos" });
  const err = form.formState.errors;
  return (
    <form
      onSubmit={form.handleSubmit((d) =>
        salvar({
          ...d,
          endereco: { ...semNulos(d.endereco), pais: end.pais ?? "BR" },
          contatos: d.contatos.map(semNulos),
        }),
      )}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CNPJ" erro={err.cnpj?.message}>
          <Entrada inputMode="numeric" {...form.register("cnpj")} />
        </Campo>
        <Campo rotulo="E-mail principal" erro={err.email?.message}>
          <Entrada type="email" {...form.register("email")} />
        </Campo>
        <Campo rotulo="Telefone" erro={err.telefone?.message}>
          <Entrada type="tel" placeholder="+55 11 3000-0000" {...form.register("telefone")} />
        </Campo>
        <Campo rotulo="WhatsApp" erro={err.whatsapp?.message}>
          <Entrada type="tel" placeholder="+55 11 90000-0000" {...form.register("whatsapp")} />
        </Campo>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-2 text-sm font-semibold">Endereço</legend>
        <Campo rotulo="Logradouro" className="sm:col-span-4">
          <Entrada {...form.register("endereco.logradouro")} />
        </Campo>
        <Campo rotulo="Número" className="sm:col-span-2">
          <Entrada {...form.register("endereco.numero")} />
        </Campo>
        <Campo rotulo="Complemento" className="sm:col-span-3">
          <Entrada {...form.register("endereco.complemento")} />
        </Campo>
        <Campo rotulo="Bairro" className="sm:col-span-3">
          <Entrada {...form.register("endereco.bairro")} />
        </Campo>
        <Campo rotulo="Cidade" className="sm:col-span-3">
          <Entrada {...form.register("endereco.cidade")} />
        </Campo>
        <Campo rotulo="UF" className="sm:col-span-1">
          <Entrada maxLength={2} className="uppercase" {...form.register("endereco.uf")} />
        </Campo>
        <Campo rotulo="CEP" erro={err.endereco?.cep?.message} className="sm:col-span-2">
          <Entrada inputMode="numeric" {...form.register("endereco.cep")} />
        </Campo>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">Outros contatos</legend>
        {contatos.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4"
          >
            <Campo rotulo="Nome" erro={err.contatos?.[i]?.nome?.message}>
              <Entrada {...form.register(`contatos.${i}.nome`)} />
            </Campo>
            <Campo rotulo="Cargo">
              <Entrada {...form.register(`contatos.${i}.cargo`)} />
            </Campo>
            <Campo rotulo="E-mail" erro={err.contatos?.[i]?.email?.message}>
              <Entrada {...form.register(`contatos.${i}.email`)} />
            </Campo>
            <Campo rotulo="Telefone" erro={err.contatos?.[i]?.telefone?.message}>
              <Entrada {...form.register(`contatos.${i}.telefone`)} />
            </Campo>
            <Campo rotulo="Observação" className="sm:col-span-3">
              <Entrada {...form.register(`contatos.${i}.observacao`)} />
            </Campo>
            <div className="flex items-end justify-end">
              <Botao variante="perigo" pequeno onClick={() => contatos.remove(i)}>
                <Trash2 className="size-3.5" /> Remover
              </Botao>
            </div>
          </div>
        ))}
        {contatos.fields.length < 30 && (
          <Botao
            variante="secundario"
            pequeno
            onClick={() =>
              contatos.append({ nome: "", cargo: "", email: "", telefone: "", observacao: "" })
            }
          >
            <Plus className="size-3.5" /> Adicionar contato
          </Botao>
        )}
      </fieldset>
      <Campo rotulo="Observações internas" erro={err.observacoes?.message}>
        <AreaTexto rows={4} {...form.register("observacoes")} />
      </Campo>
      <Rodape pendente={pendente} erro={erro} aoCancelar={props.aoConcluir} />
    </form>
  );
}

const esquemaLinks = z.object({
  links: z
    .array(
      z.object({
        nome: z.string().trim().min(1, "Informe o nome").max(80),
        url: urlObrig,
        tipo: z.enum(Object.keys(tiposLink) as [keyof typeof tiposLink]),
        ativo: z.boolean(),
      }),
    )
    .max(50),
});

export function FormLinks(props: Props) {
  const { salvar, pendente, erro } = useSalvar(props);
  const form = useForm({
    resolver: zodResolver(esquemaLinks),
    defaultValues: { links: props.empresa.links },
  });
  const itens = useFieldArray({ control: form.control, name: "links" });
  const err = form.formState.errors.links;
  return (
    <form onSubmit={form.handleSubmit(salvar)} className="space-y-3">
      {itens.fields.map((f, i) => (
        <div
          key={f.id}
          className="grid items-end gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[10rem_1fr_2fr_auto]"
        >
          <Campo rotulo="Tipo">
            <Selecao {...form.register(`links.${i}.tipo`)}>
              {opcoes(tiposLink).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Nome" erro={err?.[i]?.nome?.message}>
            <Entrada {...form.register(`links.${i}.nome`)} />
          </Campo>
          <Campo rotulo="URL" erro={err?.[i]?.url?.message}>
            <Entrada placeholder="https://" {...form.register(`links.${i}.url`)} />
          </Campo>
          <div className="flex items-center gap-3 pb-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" {...form.register(`links.${i}.ativo`)} /> Ativo
            </label>
            <button
              type="button"
              aria-label="Remover link"
              onClick={() => itens.remove(i)}
              className="text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
      <Botao
        variante="secundario"
        pequeno
        onClick={() => itens.append({ nome: "", url: "", tipo: "site", ativo: true })}
      >
        <Plus className="size-3.5" /> Adicionar link
      </Botao>
      <Rodape pendente={pendente} erro={erro} aoCancelar={props.aoConcluir} />
    </form>
  );
}

const esquemaFerramentas = z.object({
  ferramentas: z
    .array(
      z.object({
        nome: z.string().trim().min(1, "Informe o nome").max(80),
        categoria: z.enum(Object.keys(categoriasFerramenta) as [keyof typeof categoriasFerramenta]),
        status: z.enum(Object.keys(statusFerramenta) as [keyof typeof statusFerramenta]),
        descricao: textoOpc(300),
        link: urlOpc,
        observacao: textoOpc(500),
      }),
    )
    .max(100),
});

export function FormFerramentas(props: Props) {
  const { salvar, pendente, erro } = useSalvar(props);
  const form = useForm({
    resolver: zodResolver(esquemaFerramentas),
    defaultValues: {
      ferramentas: props.empresa.ferramentas.map((f) => ({
        ...f,
        descricao: v(f.descricao),
        link: v(f.link),
        observacao: v(f.observacao),
      })),
    },
  });
  const itens = useFieldArray({ control: form.control, name: "ferramentas" });
  const err = form.formState.errors.ferramentas;
  return (
    <form
      onSubmit={form.handleSubmit((d) => salvar({ ferramentas: d.ferramentas.map(semNulos) }))}
      className="space-y-3"
    >
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Registre só o que a empresa usa e onde acessar. Nunca anote senhas ou credenciais aqui.
      </p>
      {itens.fields.map((f, i) => (
        <div
          key={f.id}
          className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3"
        >
          <Campo rotulo="Nome" erro={err?.[i]?.nome?.message}>
            <Entrada {...form.register(`ferramentas.${i}.nome`)} />
          </Campo>
          <Campo rotulo="Categoria">
            <Selecao {...form.register(`ferramentas.${i}.categoria`)}>
              {opcoes(categoriasFerramenta).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Status">
            <Selecao {...form.register(`ferramentas.${i}.status`)}>
              {opcoes(statusFerramenta).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Descrição">
            <Entrada {...form.register(`ferramentas.${i}.descricao`)} />
          </Campo>
          <Campo rotulo="Link de acesso" erro={err?.[i]?.link?.message}>
            <Entrada placeholder="https://" {...form.register(`ferramentas.${i}.link`)} />
          </Campo>
          <Campo rotulo="Observação">
            <Entrada {...form.register(`ferramentas.${i}.observacao`)} />
          </Campo>
          <div className="flex justify-end sm:col-span-3">
            <Botao variante="perigo" pequeno onClick={() => itens.remove(i)}>
              <Trash2 className="size-3.5" /> Remover
            </Botao>
          </div>
        </div>
      ))}
      <Botao
        variante="secundario"
        pequeno
        onClick={() =>
          itens.append({
            nome: "",
            categoria: "outro",
            status: "em_uso",
            descricao: "",
            link: "",
            observacao: "",
          })
        }
      >
        <Plus className="size-3.5" /> Adicionar ferramenta
      </Botao>
      <Rodape pendente={pendente} erro={erro} aoCancelar={props.aoConcluir} />
    </form>
  );
}

const esquemaResponsaveis = z.object({
  responsaveis: z
    .array(
      z.object({
        atorId: z.string().min(1, "Escolha a pessoa"),
        papel: z.string().trim().min(1, "Informe a função").max(60),
      }),
    )
    .max(20, "Máximo de 20 responsáveis"),
});

export function FormResponsaveis(props: Props) {
  const { salvar, pendente, erro } = useSalvar(props);
  const atores = useListarAtores();
  const form = useForm({
    resolver: zodResolver(esquemaResponsaveis),
    defaultValues: {
      responsaveis: props.empresa.responsaveis.map((r) => ({ atorId: r.ator.id, papel: r.papel })),
    },
  });
  const itens = useFieldArray({ control: form.control, name: "responsaveis" });
  const err = form.formState.errors.responsaveis;
  return (
    <form onSubmit={form.handleSubmit(salvar)} className="space-y-3">
      <datalist id="papeis">
        {["Diretor", "Gestor", "Marketing", "Desenvolvimento", "Financeiro", "Operação"].map(
          (p) => (
            <option key={p} value={p} />
          ),
        )}
      </datalist>
      {itens.fields.map((f, i) => (
        <div key={f.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Campo rotulo="Pessoa" erro={err?.[i]?.atorId?.message}>
            <Selecao {...form.register(`responsaveis.${i}.atorId`)}>
              <option value="">Escolha…</option>
              {atores.data?.itens.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Função" erro={err?.[i]?.papel?.message}>
            <Entrada list="papeis" {...form.register(`responsaveis.${i}.papel`)} />
          </Campo>
          <button
            type="button"
            aria-label="Remover responsável"
            onClick={() => itens.remove(i)}
            className="pb-2.5 text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {itens.fields.length < 20 && (
        <Botao
          variante="secundario"
          pequeno
          onClick={() => itens.append({ atorId: "", papel: "" })}
        >
          <Plus className="size-3.5" /> Adicionar responsável
        </Botao>
      )}
      <Rodape pendente={pendente} erro={erro} aoCancelar={props.aoConcluir} />
    </form>
  );
}
