import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { useEntrar, useObterSessao } from "@/api/sessao";
import { Botao, Campo, Cartao, Entrada, MensagemErro } from "@/ui";

const esquema = z.object({
  email: z.email("Informe um e-mail válido"),
  senha: z.string().min(1, "Informe a senha"),
});

export function Entrar() {
  const sessao = useObterSessao();
  const entrar = useEntrar();
  const navegar = useNavigate();
  const de = (useLocation().state as { de?: string } | null)?.de ?? "/";
  const form = useForm({ resolver: zodResolver(esquema), defaultValues: { email: "", senha: "" } });

  if (sessao.data) return <Navigate to={de} replace />;

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Cartao className="w-full max-w-sm p-6">
        <h1 className="text-xl font-bold">
          Facilit <span className="text-marca">Hub</span>
        </h1>
        <p className="mb-6 text-sm text-slate-500">Entre para acompanhar as empresas do grupo.</p>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((d) =>
            entrar.mutate(d, { onSuccess: () => navegar(de, { replace: true }) }),
          )}
        >
          <Campo rotulo="E-mail" erro={form.formState.errors.email?.message}>
            <Entrada type="email" autoComplete="username" {...form.register("email")} />
          </Campo>
          <Campo rotulo="Senha" erro={form.formState.errors.senha?.message}>
            <Entrada type="password" autoComplete="current-password" {...form.register("senha")} />
          </Campo>
          <MensagemErro erro={entrar.error} />
          <Botao type="submit" className="w-full" disabled={entrar.isPending}>
            {entrar.isPending ? "Entrando…" : "Entrar"}
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}
