import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  UserCircle,
  Search,
  Briefcase,
  Users,
  Scale,
  Headphones,
  LogOut,
  Menu,
  Settings,
  Wallet,
} from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { RenovacaoBanner } from "@/components/RenovacaoBanner";
import { Logo } from "@/components/Logo";

const ROLE_LABEL: Record<AppRole, string> = {
  cliente: "Cliente",
  admin: "Administradora",
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "suporte";
};

const navCliente: NavItem[] = [
  { to: "/consulta", label: "Consulta", icon: MessageCircle },
  { to: "/perfil", label: "Meu Perfil", icon: UserCircle },
  { to: "/pesquisa", label: "Tira-dúvidas", icon: Search },
  { to: "/assessoria", label: "Assessoria", icon: Briefcase },
];

const navAdmin: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/advogados", label: "Advogados", icon: Scale },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/admin/suporte", label: "Suporte", icon: Headphones, badgeKey: "suporte" },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(true);
  const [adminAlertCount, setAdminAlertCount] = useState(0);

  const items: NavItem[] = role === "admin" ? navAdmin : role === "cliente" ? navCliente : [];
  const collapsed = !open;
  const inicial =
    profile?.full_name?.[0]?.toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() ||
    "?";
  const roleLabel = role ? ROLE_LABEL[role] : "";

  useEffect(() => {
    if (role !== "admin") return;
    let cancelled = false;
    void (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "cliente")
        .eq("status", "pendente");
      if (!cancelled) setAdminAlertCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`${open ? "w-64" : "w-16"} hidden sm:flex flex-col border-r bg-sidebar transition-all duration-200 sticky top-0 h-screen overflow-y-auto self-start`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b">
          {open && (
            <Link to="/" className="inline-flex items-center">
              <Logo size="sm" />
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
            const active =
              item.to === "/admin"
                ? pathname === "/admin"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            const showBadge = item.badgeKey === "suporte" && adminAlertCount > 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <span className="relative shrink-0">
                  <Icon className="w-4 h-4" />
                  {showBadge && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
                    >
                      {adminAlertCount > 9 ? "9+" : adminAlertCount}
                    </span>
                  )}
                </span>
                {open && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {showBadge && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                        {adminAlertCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#E8D0E0] p-3 space-y-2">
          <div className={`flex items-center gap-3 px-1 py-1 ${collapsed ? "justify-center" : ""}`}>
            <div
              className="w-10 h-10 rounded-full bg-[#552736] text-white flex items-center justify-center text-base font-semibold shrink-0"
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

      <main className="flex-1 min-w-0">
        <RenovacaoBanner />
        {children}
      </main>
    </div>
  );
}
