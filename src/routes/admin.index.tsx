import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  FileText,
  Scale,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface Stats {
  total_clientes: number;
  clientes_ativas: number;
  clientes_pendentes: number;
  perfis_gerados: number;
  total_advogados: number;
  vulnerabilidade_alta: number;
  consultas_hoje: number;
}

interface ClienteRecente {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  tem_perfil: boolean;
  nivel_vulnerabilidade: string;
  advogado_nome: string;
}

interface AtividadeRecente {
  id: string;
  question: string;
  area: string | null;
  created_at: string;
  user_name: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  highlight,
  pulse,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 relative">
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-3xl font-bold"
            style={{ color: highlight ? color : "#1A0010" }}
          >
            {value}
          </div>
          <div className="text-sm text-gray-500 mt-1">{label}</div>
        </div>
        <div className="relative">
          <Icon className="w-6 h-6" style={{ color }} />
          {pulse && value > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ativo: { bg: "#DCFCE7", color: "#16A34A", label: "● Ativa" },
    pendente: { bg: "#FEF9C3", color: "#D97706", label: "● Pendente" },
    inativo: { bg: "#F3F4F6", color: "#6B7280", label: "● Inativa" },
  };
  const c = map[status] ?? { bg: "#F3F4F6", color: "#6B7280", label: status };
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function VulnBadge({ nivel }: { nivel: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    alto: { bg: "#FEE2E2", color: "#DC2626", label: "Alta" },
    medio: { bg: "#FEF9C3", color: "#D97706", label: "Média" },
    baixo: { bg: "#DCFCE7", color: "#16A34A", label: "Baixa" },
    nao_gerado: { bg: "#F3F4F6", color: "#9CA3AF", label: "—" },
  };
  const c = map[nivel] ?? map.nao_gerado;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function formatRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dias = Math.floor(h / 24);
  return `${dias}d`;
}

function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [clientes, setClientes] = useState<ClienteRecente[]>([]);
  const [atividade, setAtividade] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ data: statsData }, { data: cls }, { data: qs }] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_all_clientes"),
        supabase
          .from("queries")
          .select("id, question, area, created_at, user_id, profiles!queries_user_id_fkey(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setStats(statsData as unknown as Stats);
      setClientes(((cls as unknown as ClienteRecente[]) ?? []).slice(0, 10));
      setAtividade(
        ((qs as unknown as Array<{
          id: string;
          question: string;
          area: string | null;
          created_at: string;
          profiles: { full_name: string | null; email: string | null } | null;
        }>) ?? []).map((q) => ({
          id: q.id,
          question: q.question,
          area: q.area,
          created_at: q.created_at,
          user_name: q.profiles?.full_name || q.profiles?.email?.split("@")[0] || "Cliente",
        }))
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header
        className="px-10 py-8 text-white"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <h1 className="text-[22px] font-bold">Painel Administrativo</h1>
        <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          {profile?.full_name || profile?.email?.split("@")[0]} · Administradora
        </p>
      </header>

      <div className="p-6 lg:p-10 space-y-6">
        {loading || !stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-[100px] bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total de clientes" value={stats.total_clientes} color="#A8006E" />
            <StatCard icon={UserCheck} label="Clientes ativas" value={stats.clientes_ativas} color="#16A34A" />
            <StatCard
              icon={Clock}
              label="Pendentes"
              value={stats.clientes_pendentes}
              color="#D97706"
              highlight={stats.clientes_pendentes > 0}
              pulse
            />
            <StatCard icon={FileText} label="Perfis gerados" value={stats.perfis_gerados} color="#6B0F4B" />
            <StatCard icon={Scale} label="Advogadas" value={stats.total_advogados} color="#A8006E" />
            <StatCard
              icon={AlertTriangle}
              label="Vulnerabilidade alta"
              value={stats.vulnerabilidade_alta}
              color="#DC2626"
              highlight={stats.vulnerabilidade_alta > 0}
            />
            <StatCard icon={MessageSquare} label="Tira-dúvidas 24h" value={stats.consultas_hoje} color="#A8006E" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-[#1A0010]">Clientes recentes</h2>
              <Link to="/admin/clientes" className="text-sm text-[#A8006E] hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-2 font-medium">Nome / Email</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Advogada</th>
                    <th className="px-3 py-2 font-medium">Perfil</th>
                    <th className="px-3 py-2 font-medium">Vulnerab.</th>
                    <th className="px-3 py-2 font-medium">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-[#1A0010]">
                          {c.full_name || "—"}
                        </div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-3 text-gray-600">{c.advogado_nome}</td>
                      <td className="px-3 py-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={
                            c.tem_perfil
                              ? { background: "#EDE9FE", color: "#7C3AED" }
                              : { background: "#F3F4F6", color: "#9CA3AF" }
                          }
                        >
                          {c.tem_perfil ? "✓ Gerado" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <VulnBadge nivel={c.nivel_vulnerabilidade} />
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {clientes.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        Nenhuma cliente cadastrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b">
              <h2 className="font-bold text-[#1A0010]">Atividade recente</h2>
            </div>
            <ul className="divide-y">
              {atividade.map((a) => (
                <li key={a.id} className="px-5 py-3 flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {a.user_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1A0010] truncate">
                        {a.user_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatRelative(a.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                      {a.question}
                    </p>
                    {a.area && (
                      <span className="inline-block mt-1 text-[10px] bg-[#FDF6F9] text-[#A8006E] px-1.5 py-0.5 rounded">
                        {a.area}
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {atividade.length === 0 && !loading && (
                <li className="px-5 py-8 text-center text-gray-500 text-sm">
                  Sem atividade recente.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
