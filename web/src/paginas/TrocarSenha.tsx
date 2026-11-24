import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { useSair, useTrocarSenha } from "@/api/sessao";
import { Botao, Campo, Cartao, Entrada, MensagemErro } from "@/ui";

const esquema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z.string().min(12, "Mínimo de 12 caracteres").max(200, "Máximo de 200 caracteres"),
    confirmacao: z.string(),
  })
  .refine((d) => d.confirmacao === d.novaSenha, {
    path: ["confirmacao"],
    message: "As senhas não conferem",
  })
  .refine((d) => d.novaSenha !== d.senhaAtual, {
    path: ["novaSenha"],
    message: "A nova senha precisa ser diferente da atual",
  });

function FormTrocaSenha({ aoConcluir }: { aoConcluir: () => void }) {
  const trocar = useTrocarSenha();
  const form = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { senhaAtual: "", novaSenha: "", confirmacao: "" },
  });
  const erro = form.formState.errors;
  return (
    <form
      method="post"
      className="space-y-4"
      onSubmit={form.handleSubmit(({ senhaAtual, novaSenha }) =>
        trocar.mutate(
          { senhaAtual, novaSenha },
          {
            onSuccess: () => {
              form.reset();
              aoConcluir();
            },
          },
        ),
      )}
    >
      <Campo rotulo="Senha atual" erro={erro.senhaAtual?.message}>
        <Entrada type="password" autoComplete="current-password" {...form.register("senhaAtual")} />
      </Campo>
      <Campo rotulo="Nova senha" erro={erro.novaSenha?.message}>
        <Entrada type="password" autoComplete="new-password" {...form.register("novaSenha")} />
      </Campo>
      <Campo rotulo="Confirme a nova senha" erro={erro.confirmacao?.message}>
        <Entrada type="password" autoComplete="new-password" {...form.register("confirmacao")} />
      </Campo>
      <p className="text-xs text-slate-500">
        Mínimo de 12 caracteres. As suas outras sessões abertas serão encerradas.
      </p>
      <MensagemErro erro={trocar.error} />
      <Botao type="submit" className="w-full" disabled={trocar.isPending}>
        {trocar.isPending ? "Trocando…" : "Trocar senha"}
      </Botao>
    </form>
  );
}

/** Troca voluntária, pelo menu. */
export function TrocarSenha() {
  const [feito, setFeito] = useState(false);
  return (
    <div className="max-w-sm space-y-5">
      <h1 className="text-2xl font-bold">Trocar senha</h1>
      <Cartao className="p-6">
        {feito && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            Senha trocada. As outras sessões da sua conta foram encerradas.
          </p>
        )}
        <FormTrocaSenha aoConcluir={() => setFeito(true)} />
      </Cartao>
    </div>
  );
}

/** Primeiro acesso ou senha redefinida pelo administrador: sem menu até trocar. */
export function TrocaObrigatoria({ nome }: { nome: string }) {
  const navegar = useNavigate();
  const sair = useSair();
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Cartao className="w-full max-w-sm p-6">
        <h1 className="text-xl font-bold">Crie a sua senha</h1>
        <p className="mb-6 text-sm text-slate-500">
          Olá, {nome}. Você entrou com uma senha provisória. Para continuar, troque-a por uma senha
          só sua.
        </p>
        <FormTrocaSenha aoConcluir={() => navegar("/", { replace: true })} />
        <Botao variante="fantasma" className="mt-3 w-full" onClick={() => sair.mutate()}>
          Sair
        </Botao>
      </Cartao>
    </div>
  );
}
