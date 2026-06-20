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
  X,
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
  { to: "/perfil", label: "Perfil", icon: UserCircle },
  { to: "/pesquisa", label: "Dúvidas", icon: Search },
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

// Rotas onde a barra inferior fica escondida no mobile (chat imersivo)
const IMMERSIVE_PATHS = ["/consulta", "/onboarding"];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminAlertCount, setAdminAlertCount] = useState(0);

  const items: NavItem[] = role === "admin" ? navAdmin : role === "cliente" ? navCliente : [];
  const collapsed = !open;
  const inicial =
    profile?.full_name?.[0]?.toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() ||
    "?";
  const roleLabel = role ? ROLE_LABEL[role] : "";
  const immersive = IMMERSIVE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

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

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* === Sidebar desktop (inalterado) === */}
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
            const active = isActive(item.to);
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

      <main className="flex-1 min-w-0 flex flex-col">
        {/* === Top bar mobile (não aparece em rotas imersivas) === */}
        {!immersive && items.length > 0 && (
          <header className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#F3E8F0] safe-pt">
            <div className="flex items-center justify-between px-4 h-14">
              <Link to="/" className="inline-flex items-center min-w-0">
                <Logo size="sm" />
              </Link>
              {role === "admin" ? (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Abrir menu"
                  className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-md text-[#6B0F4B] relative"
                >
                  <Menu className="w-6 h-6" />
                  {adminAlertCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {adminAlertCount > 9 ? "9+" : adminAlertCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  aria-label="Sair"
                  className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-md text-[#6B0F4B]"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </header>
        )}

        <RenovacaoBanner />

        <div
          className={`flex-1 min-w-0 ${
            !immersive && items.length > 0
              ? role === "cliente"
                ? "pb-[calc(72px+env(safe-area-inset-bottom))] sm:pb-0"
                : ""
              : ""
          }`}
        >
          {children}
        </div>

        {/* === Bottom tab bar mobile (cliente) === */}
        {!immersive && role === "cliente" && (
          <nav
            className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[#F3E8F0] safe-pb"
            aria-label="Navegação principal"
          >
            <ul className="grid grid-cols-4">
              {navCliente.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex flex-col items-center justify-center gap-0.5 h-[64px] text-[11px] font-medium transition-colors ${
                        active ? "text-[#A8006E]" : "text-[#6B5560]"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? "" : "opacity-80"}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* === Drawer mobile (admin) === */}
        {mobileMenuOpen && (
          <div className="sm:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />
            <aside className="absolute right-0 top-0 bottom-0 w-[82%] max-w-xs bg-white shadow-2xl flex flex-col safe-pt safe-pb">
              <div className="flex items-center justify-between px-4 h-14 border-b border-[#F3E8F0]">
                <Logo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="w-11 h-11 -mr-2 inline-flex items-center justify-center text-[#6B0F4B]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-2 py-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  const showBadge = item.badgeKey === "suporte" && adminAlertCount > 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-base ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-[#1A0010] hover:bg-[#F3E8F0]"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
                          {adminAlertCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-[#F3E8F0] p-3">
                <div className="flex items-center gap-3 px-1 py-2">
                  <div className="w-10 h-10 rounded-full bg-[#552736] text-white flex items-center justify-center text-base font-semibold shrink-0">
                    {inicial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1A0010] truncate">
                      {profile?.full_name || profile?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-gray-500">{roleLabel}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-2 w-full flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-base text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
