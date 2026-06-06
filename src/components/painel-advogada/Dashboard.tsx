import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  FileText,
  AlertTriangle,
  Copy,
  Search,
  X,
  Mail,
  Phone,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClienteRow {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  queries_used: number;
  queries_limit: number;
  perfil_generations_used: number;
  tem_perfil: boolean;
  nivel_vulnerabilidade: string;
}

interface Stats {
  total_clientes: number;
  clientes_ativos: number;
  com_perfil: number;
  vulnerabilidade_alta: number;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ativo: { bg: "#DCFCE7", color: "#15803D", label: "Ativa" },
  pendente: { bg: "#FEF9C3", color: "#A16207", label: "Pendente" },
  inativo: { bg: "#F3F4F6", color: "#6B7280", label: "Inativa" },
};

const NIVEL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  alto: { bg: "#FEE2E2", color: "#B91C1C", label: "Alta" },
  medio: { bg: "#FEF3C7", color: "#B45309", label: "Média" },
  baixo: { bg: "#DCFCE7", color: "#15803D", label: "Baixa" },
  nao_gerado: { bg: "#F3F4F6", color: "#6B7280", label: "Não gerado" },
};

export function inicial(nome: string | null | undefined, email: string | null | undefined) {
  return (
    nome?.trim()[0]?.toUpperCase() ||
    email?.trim()[0]?.toUpperCase() ||
    "?"
  );
}

export function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.pendente;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export function PerfilBadge({ tem }: { tem: boolean }) {
  return tem ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#DCFCE7", color: "#15803D" }}>
      Gerado
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#F3F4F6", color: "#6B7280" }}>
      Pendente
    </span>
  );
}

export function NivelBadge({ nivel }: { nivel: string }) {
  const cfg = NIVEL_BADGE[nivel] ?? NIVEL_BADGE.nao_gerado;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
}: {
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-card rounded-2xl border p-5 flex items-start gap-4 shadow-sm">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-[#1A0010] leading-none">{value}</p>
        <p className="text-sm text-muted-foreground mt-1.5">{label}</p>
      </div>
    </div>
  );
}

export function ClienteDrawer({
  cliente,
  onClose,
}: {
  cliente: ClienteRow | null;
  onClose: () => void;
}) {
  if (!cliente) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="font-display text-lg font-semibold">Detalhes da cliente</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-xl font-semibold">
              {inicial(cliente.full_name, cliente.email)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#1A0010] truncate">
                {cliente.full_name || "Sem nome"}
              </p>
              <p className="text-sm text-muted-foreground truncate">{cliente.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoTile label="Status" value={<StatusBadge status={cliente.status} />} />
            <InfoTile label="Perfil" value={<PerfilBadge tem={cliente.tem_perfil} />} />
            <InfoTile label="Vulnerabilidade" value={<NivelBadge nivel={cliente.nivel_vulnerabilidade} />} />
            <InfoTile
              label="Perguntas usadas"
              value={
                <span className="font-semibold text-[#1A0010]">
                  {cliente.queries_used}/{cliente.queries_limit}
                </span>
              }
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="truncate">{cliente.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>Cadastro em {formatarData(cliente.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{cliente.perfil_generations_used} perfil(is) gerado(s)</span>
            </div>
          </div>
        </div>

        <div className="border-t p-5 space-y-2">
          <button
            disabled
            className="w-full py-2.5 rounded-lg border text-sm font-medium opacity-60 cursor-not-allowed"
          >
            Ver perfil completo
          </button>
          <button
            disabled
            title="Disponível em breve"
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "#25D366" }}
          >
            <Phone className="w-4 h-4" />
            Enviar mensagem
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-[#FDF6F9] p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
      <div>{value}</div>
    </div>
  );
}

export function LinkIndicacao({ partnerCode, comissao }: { partnerCode: string | null; comissao: number }) {
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    setBaseUrl(typeof window !== "undefined" ? window.location.origin : "");
  }, []);
  const link = partnerCode ? `${baseUrl}/cadastro?ref=${partnerCode}` : "";

  const copiar = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#FDF6F9", borderColor: "#E8D0E0" }}
    >
      <h3 className="font-display text-lg font-semibold text-[#1A0010] mb-1">
        🔗 Seu link de indicação
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Compartilhe este link para que suas clientes se cadastrem vinculadas à sua conta:
      </p>
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 px-3 py-2.5 rounded-lg bg-white border text-sm font-mono truncate">
          {link || "—"}
        </div>
        <button
          onClick={copiar}
          disabled={!link}
          className="px-4 rounded-lg bg-[#6B0F4B] text-white text-sm font-medium hover:bg-[#A8006E] disabled:opacity-50 flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copiar
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Você recebe <span className="font-semibold text-[#A8006E]">{comissao}%</span> de cada
        venda gerada pelo seu link.
      </p>
    </div>
  );
}

export function ClientesTable({
  clientes,
  onSelect,
}: {
  clientes: ClienteRow[];
  onSelect: (c: ClienteRow) => void;
}) {
  if (clientes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma cliente encontrada com este filtro.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
            <th className="py-3 px-3">Cliente</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3">Perfil</th>
            <th className="py-3 px-3">Vulnerab.</th>
            <th className="py-3 px-3">Perguntas</th>
            <th className="py-3 px-3">Cadastro</th>
            <th className="py-3 px-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c)}
              className="border-b last:border-0 hover:bg-[#FDF6F9] cursor-pointer transition-colors"
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    {inicial(c.full_name, c.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A0010] truncate">{c.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3"><StatusBadge status={c.status} /></td>
              <td className="py-3 px-3"><PerfilBadge tem={c.tem_perfil} /></td>
              <td className="py-3 px-3"><NivelBadge nivel={c.nivel_vulnerabilidade} /></td>
              <td className="py-3 px-3 font-medium text-[#1A0010]">
                {c.queries_used}/{c.queries_limit}
              </td>
              <td className="py-3 px-3 text-muted-foreground">{formatarData(c.created_at)}</td>
              <td className="py-3 px-3 text-muted-foreground">
                <ChevronRight className="w-4 h-4" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PainelAdvogadaDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [comissao, setComissao] = useState(20);
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<ClienteRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [statsRes, clientesRes, partnerRes] = await Promise.all([
        supabase.rpc("get_advogado_stats"),
        supabase.rpc("get_minhas_clientes"),
        profile
          ? supabase
              .from("partner_links")
              .select("commission_percent")
              .eq("advogado_id", profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancel) return;
      setStats((statsRes.data as unknown as Stats) ?? null);
      setClientes((clientesRes.data as unknown as ClienteRow[]) ?? []);
      const partner = partnerRes.data as { commission_percent?: number } | null;
      if (partner?.commission_percent != null) setComissao(partner.commission_percent);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [profile]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q),
    );
  }, [clientes, busca]);

  const primeiroNome = profile?.full_name?.split(" ")[0] || "Doutora";

  return (
    <div className="min-h-screen bg-background">
      {/* SEÇÃO 1 — Header */}
      <div
        className="px-8 py-8 text-white"
        style={{ background: "linear-gradient(135deg,#6B0F4B,#A8006E)" }}
      >
        <h1 className="font-display text-2xl font-bold">Olá, {primeiroNome}! 👋</h1>
        <p className="text-white/80 text-sm mt-1">
          Aqui está o resumo das suas clientes hoje.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto">
        {/* SEÇÃO 2 — Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            iconBg="#FDF6F9"
            iconColor="#A8006E"
            value={stats?.total_clientes ?? 0}
            label="Clientes cadastradas"
          />
          <StatCard
            icon={UserCheck}
            iconBg="#DCFCE7"
            iconColor="#15803D"
            value={stats?.clientes_ativos ?? 0}
            label="Com acesso ativo"
          />
          <StatCard
            icon={FileText}
            iconBg="#EDE9FE"
            iconColor="#6D28D9"
            value={stats?.com_perfil ?? 0}
            label="Perfis jurídicos prontos"
          />
          <StatCard
            icon={AlertTriangle}
            iconBg="#FEE2E2"
            iconColor="#B91C1C"
            value={stats?.vulnerabilidade_alta ?? 0}
            label="Vulnerabilidade alta"
          />
        </div>

        {/* SEÇÃO 3 — Lista */}
        <section className="bg-card rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1A0010]">
                Suas clientes
              </h2>
              <p className="text-xs text-muted-foreground">
                {clientes.length} total{clientes.length !== 1 ? "is" : ""}
              </p>
            </div>
            <Link
              to="/painel-advogada/clientes"
              className="text-sm text-[#A8006E] hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>

          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Carregando…</div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="font-medium text-[#1A0010]">
                Você ainda não tem clientes cadastradas.
              </p>
              <p className="text-sm text-muted-foreground">
                Compartilhe seu link de indicação para começar.
              </p>
            </div>
          ) : (
            <ClientesTable clientes={filtradas} onSelect={setSelecionada} />
          )}
        </section>

        {/* SEÇÃO 4 — Link */}
        <LinkIndicacao partnerCode={profile?.partner_code ?? null} comissao={comissao} />
      </div>

      <ClienteDrawer cliente={selecionada} onClose={() => setSelecionada(null)} />
    </div>
  );
}
