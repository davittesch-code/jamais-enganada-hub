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
  Sparkles,
} from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const NAV: NavItem[] = [
  { to: "/onboarding", label: "Boas-vindas", icon: Sparkles, roles: ["cliente"] },
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

        <div className="border-t p-3">
          <div className={`flex items-center ${open ? "justify-between" : "justify-center"} gap-2`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
              </div>
              {open && (
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{profile?.full_name || profile?.email}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
                </div>
              )}
            </div>
            {open && (
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
