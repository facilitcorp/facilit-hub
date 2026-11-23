import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";
import type { Tom } from "@/dominio/rotulos";
import { iniciais, urlSegura } from "@/dominio/formato";

const tons: Record<Tom, string> = {
  neutro: "bg-slate-100 text-slate-700 ring-slate-200",
  azul: "bg-blue-50 text-blue-700 ring-blue-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amarelo: "bg-amber-50 text-amber-800 ring-amber-200",
  vermelho: "bg-red-50 text-red-700 ring-red-200",
  cinza: "bg-slate-100 text-slate-500 ring-slate-200",
  roxo: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Selo({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        tons[tom],
      )}
    >
      {children}
    </span>
  );
}

export function Progresso({ valor, compacto }: { valor: number; compacto?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div className="flex items-center gap-2" aria-label={`Progresso ${v}%`}>
      <div className={clsx("flex-1 rounded-full bg-slate-200", compacto ? "h-1.5" : "h-2")}>
        <div
          className={clsx("h-full rounded-full", v === 100 ? "bg-emerald-500" : "bg-marca")}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-600">{v}%</span>
    </div>
  );
}

export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Secao({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Cartao className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </Cartao>
  );
}

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
const variantes: Record<Variante, string> = {
  primario: "bg-marca text-white hover:bg-marca-forte",
  secundario: "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
  fantasma: "text-slate-600 hover:bg-slate-100",
  perigo: "text-red-600 hover:bg-red-50",
};

export const Botao = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean }
>(function Botao({ variante = "primario", pequeno, className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        pequeno ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        variantes[variante],
        className,
      )}
      {...props}
    />
  );
});

const campoBase =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-marca focus:outline-none";

export function Campo({
  rotulo,
  erro,
  children,
  className,
}: {
  rotulo: string;
  erro?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block space-y-1", className)}>
      <span className="text-xs font-medium text-slate-600">{rotulo}</span>
      {children}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </label>
  );
}

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Entrada({ className, ...p }, ref) {
    return <input ref={ref} className={clsx(campoBase, className)} {...p} />;
  },
);

export const AreaTexto = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AreaTexto({ className, ...p }, ref) {
  return <textarea ref={ref} rows={3} className={clsx(campoBase, className)} {...p} />;
});

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Selecao({ className, ...p }, ref) {
    return <select ref={ref} className={clsx(campoBase, "pr-8", className)} {...p} />;
  },
);

export function Logo({
  nome,
  url,
  tamanho = "md",
}: {
  nome: string;
  url?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const t = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-20 text-xl" }[tamanho];
  return urlSegura(url) ? (
    <img
      src={url}
      alt=""
      className={clsx(t, "shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200")}
    />
  ) : (
    <div
      aria-hidden
      className={clsx(
        t,
        "grid shrink-0 place-items-center rounded-lg bg-slate-800 font-semibold text-white",
      )}
    >
      {iniciais(nome)}
    </div>
  );
}

export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700"
    >
      {iniciais(nome)}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

export function Carregando() {
  return <p className="p-6 text-sm text-slate-500">Carregando…</p>;
}

export function Falha({ erro }: { erro: unknown }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
      Não foi possível carregar. {erro instanceof Error ? erro.message : ""}
    </p>
  );
}

export function MensagemErro({ erro }: { erro: unknown }) {
  if (!erro) return null;
  const conflito = (erro as { conflito?: boolean }).conflito;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {conflito
        ? "Outra pessoa alterou este registro enquanto você editava. Recarregue para ver a versão atual."
        : erro instanceof Error
          ? erro.message
          : "Não foi possível salvar."}
    </p>
  );
}
