import { Building2, FileText, FolderKanban, KeyRound, LogOut, Sun, Users } from "lucide-react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router";
import { clsx } from "clsx";
import { useObterSessao, useSair } from "@/api/sessao";
import type { Permissao } from "@/api/tipos";
import { TrocaObrigatoria } from "@/paginas/TrocarSenha";
import { Avatar, Carregando, Falha } from "@/ui";

const menu: {
  para: string;
  rotulo: string;
  icone: typeof Sun;
  fim?: boolean;
  exige?: Permissao;
}[] = [
  { para: "/", rotulo: "Hoje na", icone: Sun, fim: true },
  { para: "/empresas", rotulo: "Empresas", icone: Building2 },
  { para: "/projetos", rotulo: "Projetos", icone: FolderKanban },
  { para: "/documentos", rotulo: "Documentos", icone: FileText },
  { para: "/usuarios", rotulo: "Usuários", icone: Users, exige: "usuarios.gerir" },
  { para: "/senha", rotulo: "Trocar senha", icone: KeyRound },
];

export function Estrutura() {
  const sessao = useObterSessao();
  const sair = useSair();
  const local = useLocation();

  if (sessao.isPending) return <Carregando />;
  if (sessao.isError) return <Falha erro={sessao.error} />;
  if (!sessao.data) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  // Senha provisória: o back só libera sessão, sair e troca; qualquer rota vira a troca.
  if (sessao.data.usuario.trocarSenha) {
    if (local.pathname !== "/senha") return <Navigate to="/senha" replace />;
    return <TrocaObrigatoria nome={sessao.data.usuario.nome} />;
  }
  const organizacao = sessao.data.organizacao.nome;
  const permissoes = sessao.data.permissoes;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <p className="text-lg font-bold tracking-tight">
            Facilit <span className="text-marca">Hub</span>
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {menu
            .filter((m) => !m.exige || permissoes.includes(m.exige))
            .map((m) => (
              <NavLink
                key={m.para}
                to={m.para}
                end={m.fim}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                    isActive
                      ? "bg-slate-100 font-medium text-slate-900"
                      : "text-slate-600 hover:bg-slate-50",
                  )
                }
              >
                <m.icone className="size-4" />
                {m.fim ? `${m.rotulo} ${organizacao}` : m.rotulo}
              </NavLink>
            ))}
        </nav>
        <div className="hidden items-center gap-2 border-t border-slate-200 px-5 py-3 md:absolute md:inset-x-0 md:bottom-0 md:flex">
          <Avatar nome={sessao.data.usuario.nome} />
          <span className="flex-1 truncate text-sm">{sessao.data.usuario.nome}</span>
          <button
            onClick={() => sair.mutate()}
            aria-label="Sair"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
