import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  UserCircle,
  Search,
  Briefcase,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

const ROLE_LABEL: Record<AppRole, string> = {
  cliente: "Cliente",
  advogado: "Advogada Parceira",
  super_admin: "Administradora",
};

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const NAV: NavItem[] = [
  { to: "/consulta", label: "Consulta IA", icon: MessageCircle, roles: ["cliente"] },
  { to: "/perfil", label: "Meu Perfil", icon: UserCircle, roles: ["cliente"] },
  { to: "/pesquisa", label: "Tira-dúvidas", icon: Search, roles: ["cliente"] },
  { to: "/assessoria", label: "Assessoria", icon: Briefcase, roles: ["cliente"] },
  { to: "/painel-advogada", label: "Clientes", icon: Users, roles: ["advogado"] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["super_admin"] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(true);

  const items = NAV.filter((i) => (role ? i.roles.includes(role) : false));

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`${open ? "w-64" : "w-16"} hidden md:flex flex-col border-r bg-sidebar transition-all duration-200`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b">
          {open && (
            <Link to="/" className="font-display text-lg font-semibold text-primary">
              Jamais Enganada
            </Link>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
            aria-label="Alternar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {open && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#E8D0E0] p-3 space-y-2">
          {/* Card do usuário */}
          <div className={`flex items-center gap-3 px-1 py-1 ${collapsed ? "justify-center" : ""}`}>
            <div
              className="w-10 h-10 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-base font-semibold shrink-0"
              title={collapsed ? profile?.full_name ?? profile?.email ?? "" : undefined}
            >
              {inicial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1A0010] truncate">
                  {profile?.full_name || profile?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>
            )}
          </div>

          {/* Minha conta */}
          {!collapsed && (
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Minha conta</span>
            </button>
          )}

          {/* Sair */}
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sair" : undefined}
            className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-md text-sm transition-colors hover:bg-[#FEE2E2]`}
            style={{ color: "#DC2626" }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
