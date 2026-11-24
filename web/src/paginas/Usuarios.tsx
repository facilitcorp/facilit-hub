import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound, Pencil, Plus, Power, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useObterSessao, usePode } from "@/api/sessao";
import type { Conta, Papel } from "@/api/tipos";
import {
  useAtualizarUsuario,
  useCriarUsuario,
  useListarUsuarios,
  useRedefinirSenha,
} from "@/api/usuarios";
import { dataCurta } from "@/dominio/formato";
import { opcoes, papeis } from "@/dominio/rotulos";
import { gerarSenha } from "@/dominio/senha";
import {
  Botao,
  Campo,
  Cartao,
  Carregando,
  Entrada,
  Falha,
  MensagemErro,
  Selecao,
  Selo,
  Vazio,
} from "@/ui";
import { Modal } from "@/ui/Modal";

const PAPEIS = ["administrador", "gestor", "membro"] as const;
const nome = z.string().trim().min(1, "Informe o nome").max(120, "Máximo de 120 caracteres");
const senhaProvisoria = z
  .string()
  .min(12, "Mínimo de 12 caracteres")
  .max(200, "Máximo de 200 caracteres");

function Situacao({ conta }: { conta: Conta }) {
  if (!conta.ativo) return <Selo tom="cinza">Desativada</Selo>;
  if (conta.trocarSenha) return <Selo tom="amarelo">Aguardando troca de senha</Selo>;
  return <Selo tom="verde">Ativa</Selo>;
}

/** Campo da senha provisória: visível para o administrador copiar, com "Gerar". */
function CampoSenha({
  form,
  erro,
}: {
  form: UseFormReturn<{ senhaProvisoria: string }>;
  erro?: string;
}) {
  return (
    <Campo rotulo="Senha provisória" erro={erro}>
      <div className="flex gap-2">
        <Entrada
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          {...form.register("senhaProvisoria")}
        />
        <Botao
          variante="secundario"
          aria-label="Gerar senha"
          onClick={() => form.setValue("senhaProvisoria", gerarSenha(), { shouldValidate: true })}
        >
          <RefreshCw className="size-4" /> Gerar
        </Botao>
      </div>
    </Campo>
  );
}

/** Mostra a senha provisória uma única vez; ao fechar, ela sai da memória da tela. */
function SenhaGerada({
  email,
  senha,
  aoFechar,
}: {
  email: string;
  senha: string;
  aoFechar: () => void;
}) {
  const [copiada, setCopiada] = useState(false);
  return (
    <Modal titulo="Senha provisória" aberto aoFechar={aoFechar}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Passe esta senha a <strong>{email}</strong> por um canal seguro. Ela não será mostrada de
          novo. No primeiro acesso, a pessoa vai criar a própria senha.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
          <code aria-label="Senha provisória gerada" className="flex-1 font-mono text-sm break-all">
            {senha}
          </code>
          <Botao
            variante="secundario"
            pequeno
            onClick={() => void navigator.clipboard.writeText(senha).then(() => setCopiada(true))}
          >
            {copiada ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copiada ? "Copiada" : "Copiar"}
          </Botao>
        </div>
        <div className="flex justify-end">
          <Botao onClick={aoFechar}>Pronto</Botao>
        </div>
      </div>
    </Modal>
  );
}

const esquemaNova = z.object({
  nome,
  email: z.email("Informe um e-mail válido").max(254),
  papel: z.enum(PAPEIS),
  senhaProvisoria,
});

function NovaConta({
  aoFechar,
  aoCriar,
}: {
  aoFechar: () => void;
  aoCriar: (email: string, senha: string) => void;
}) {
  const criar = useCriarUsuario();
  const form = useForm({
    resolver: zodResolver(esquemaNova),
    defaultValues: { nome: "", email: "", papel: "membro" as Papel, senhaProvisoria: gerarSenha() },
  });
  const erro = form.formState.errors;
  return (
    <Modal titulo="Nova conta" aberto aoFechar={aoFechar}>
      <form
        method="post"
        className="space-y-4"
        onSubmit={form.handleSubmit((d) =>
          criar.mutate(d, { onSuccess: (c) => aoCriar(c.email, d.senhaProvisoria) }),
        )}
      >
        <Campo rotulo="Nome" erro={erro.nome?.message}>
          <Entrada autoComplete="off" {...form.register("nome")} />
        </Campo>
        <Campo rotulo="E-mail" erro={erro.email?.message}>
          <Entrada type="email" autoComplete="off" {...form.register("email")} />
        </Campo>
        <Campo rotulo="Papel">
          <Selecao {...form.register("papel")}>
            {opcoes(papeis).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo} — {papeis[o.valor].descricao}
              </option>
            ))}
          </Selecao>
        </Campo>
        <CampoSenha
          form={form as unknown as UseFormReturn<{ senhaProvisoria: string }>}
          erro={erro.senhaProvisoria?.message}
        />
        <MensagemErro erro={criar.error} />
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={criar.isPending}>
            Criar conta
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

function EditarConta({
  conta,
  propria,
  aoFechar,
}: {
  conta: Conta;
  propria: boolean;
  aoFechar: () => void;
}) {
  const atualizar = useAtualizarUsuario();
  const form = useForm({
    resolver: zodResolver(z.object({ nome, papel: z.enum(PAPEIS) })),
    defaultValues: { nome: conta.nome, papel: conta.papel },
  });
  return (
    <Modal titulo={`Editar ${conta.nome}`} aberto aoFechar={aoFechar}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((d) =>
          // Na própria conta o papel nem vai: o back recusa a mudança (`propria_conta`).
          atualizar.mutate(
            propria ? { usuarioId: conta.id, nome: d.nome } : { usuarioId: conta.id, ...d },
            { onSuccess: aoFechar },
          ),
        )}
      >
        <Campo rotulo="Nome" erro={form.formState.errors.nome?.message}>
          <Entrada autoComplete="off" {...form.register("nome")} />
        </Campo>
        {!propria && (
          <Campo rotulo="Papel">
            <Selecao {...form.register("papel")}>
              {opcoes(papeis).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo} — {papeis[o.valor].descricao}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        <MensagemErro erro={atualizar.error} />
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={atualizar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

function RedefinirSenha({
  conta,
  aoFechar,
  aoRedefinir,
}: {
  conta: Conta;
  aoFechar: () => void;
  aoRedefinir: (email: string, senha: string) => void;
}) {
  const redefinir = useRedefinirSenha();
  const form = useForm({
    resolver: zodResolver(z.object({ senhaProvisoria })),
    defaultValues: { senhaProvisoria: gerarSenha() },
  });
  return (
    <Modal titulo={`Redefinir a senha de ${conta.nome}`} aberto aoFechar={aoFechar}>
      <form
        method="post"
        className="space-y-4"
        onSubmit={form.handleSubmit((d) =>
          redefinir.mutate(
            { usuarioId: conta.id, ...d },
            { onSuccess: (c) => aoRedefinir(c.email, d.senhaProvisoria) },
          ),
        )}
      >
        <p className="text-sm text-slate-600">
          As sessões abertas dessa conta serão encerradas, e a pessoa terá de criar uma senha nova
          no próximo acesso.
        </p>
        <CampoSenha form={form} erro={form.formState.errors.senhaProvisoria?.message} />
        <MensagemErro erro={redefinir.error} />
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={redefinir.isPending}>
            Redefinir senha
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

type Dialogo =
  | { tipo: "nova" }
  | { tipo: "editar"; conta: Conta }
  | { tipo: "senha"; conta: Conta }
  | { tipo: "gerada"; email: string; senha: string };

export function Usuarios() {
  const pode = usePode("usuarios.gerir");
  const eu = useObterSessao().data?.usuario.id;
  const lista = useListarUsuarios(pode);
  const situacao = useAtualizarUsuario();
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const fechar = () => setDialogo(null);
  const mostrarSenha = (email: string, senha: string) =>
    setDialogo({ tipo: "gerada", email, senha });

  if (!pode) return <Vazio>Só administradores gerenciam as contas de acesso.</Vazio>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Botao onClick={() => setDialogo({ tipo: "nova" })}>
          <Plus className="size-4" /> Nova conta
        </Botao>
      </div>
      <MensagemErro erro={situacao.error} />
      <Cartao className="overflow-x-auto">
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <Falha erro={lista.error} />
        ) : lista.data.itens.length === 0 ? (
          <Vazio>Nenhuma conta.</Vazio>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Papel</th>
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium">Criada em</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.data.itens.map((c) => {
                const propria = c.id === eu;
                return (
                  <tr key={c.id} className={c.ativo ? "" : "text-slate-500"}>
                    <td className="px-4 py-2.5 font-medium">
                      {c.nome}
                      {propria && <span className="ml-1.5 text-xs text-slate-500">(você)</span>}
                    </td>
                    <td className="px-4 py-2.5">{c.email}</td>
                    <td className="px-4 py-2.5">{papeis[c.papel].rotulo}</td>
                    <td className="px-4 py-2.5">
                      <Situacao conta={c} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{dataCurta(c.criadoEm)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Botao
                          variante="fantasma"
                          pequeno
                          aria-label={`Editar ${c.nome}`}
                          onClick={() => setDialogo({ tipo: "editar", conta: c })}
                        >
                          <Pencil className="size-3.5" />
                        </Botao>
                        <Botao
                          variante="fantasma"
                          pequeno
                          aria-label={`Redefinir a senha de ${c.nome}`}
                          onClick={() => setDialogo({ tipo: "senha", conta: c })}
                        >
                          <KeyRound className="size-3.5" />
                        </Botao>
                        {!propria && (
                          <Botao
                            variante={c.ativo ? "perigo" : "fantasma"}
                            pequeno
                            disabled={situacao.isPending}
                            onClick={() => {
                              if (
                                c.ativo &&
                                !window.confirm(
                                  `Desativar ${c.nome}? A pessoa sai na hora e deixa de poder ser responsável.`,
                                )
                              )
                                return;
                              situacao.mutate({ usuarioId: c.id, ativo: !c.ativo });
                            }}
                          >
                            <Power className="size-3.5" /> {c.ativo ? "Desativar" : "Reativar"}
                          </Botao>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Cartao>

      {dialogo?.tipo === "nova" && <NovaConta aoFechar={fechar} aoCriar={mostrarSenha} />}
      {dialogo?.tipo === "editar" && (
        <EditarConta conta={dialogo.conta} propria={dialogo.conta.id === eu} aoFechar={fechar} />
      )}
      {dialogo?.tipo === "senha" && (
        <RedefinirSenha conta={dialogo.conta} aoFechar={fechar} aoRedefinir={mostrarSenha} />
      )}
      {dialogo?.tipo === "gerada" && (
        <SenhaGerada email={dialogo.email} senha={dialogo.senha} aoFechar={fechar} />
      )}
    </div>
  );
}
