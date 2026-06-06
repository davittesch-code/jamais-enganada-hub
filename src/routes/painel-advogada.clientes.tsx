import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { supabase } from "@/integrations/supabase/client";
import {
  ClientesTable,
  ClienteDrawer,
  type ClienteRow,
} from "@/components/painel-advogada/Dashboard";

export const Route = createFileRoute("/painel-advogada/clientes")({
  component: () => (
    <PrivateRoute roles={["advogado", "super_admin"]}>
      <ClientesPage />
    </PrivateRoute>
  ),
});

function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [selecionada, setSelecionada] = useState<ClienteRow | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_minhas_clientes");
      if (cancel) return;
      setClientes((data as unknown as ClienteRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      if (q && !((c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))) return false;
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (filtroNivel !== "todos" && c.nivel_vulnerabilidade !== filtroNivel) return false;
      if (filtroPerfil === "com" && !c.tem_perfil) return false;
      if (filtroPerfil === "sem" && c.tem_perfil) return false;
      return true;
    });
  }, [clientes, busca, filtroStatus, filtroNivel, filtroPerfil]);

  return (
    <div className="min-h-screen bg-background">
      <div
        className="px-8 py-8 text-white"
        style={{ background: "linear-gradient(135deg,#6B0F4B,#A8006E)" }}
      >
        <h1 className="font-display text-2xl font-bold">Minhas clientes</h1>
        <p className="text-white/80 text-sm mt-1">
          {clientes.length} cliente(s) vinculada(s) à sua conta.
        </p>
      </div>

      <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-5">
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Status"
              value={filtroStatus}
              onChange={setFiltroStatus}
              options={[
                { value: "todos", label: "Todos" },
                { value: "ativo", label: "Ativa" },
                { value: "pendente", label: "Pendente" },
                { value: "inativo", label: "Inativa" },
              ]}
            />
            <Select
              label="Vulnerabilidade"
              value={filtroNivel}
              onChange={setFiltroNivel}
              options={[
                { value: "todos", label: "Todas" },
                { value: "alto", label: "Alta" },
                { value: "medio", label: "Média" },
                { value: "baixo", label: "Baixa" },
                { value: "nao_gerado", label: "Não gerado" },
              ]}
            />
            <Select
              label="Perfil jurídico"
              value={filtroPerfil}
              onChange={setFiltroPerfil}
              options={[
                { value: "todos", label: "Todos" },
                { value: "com", label: "Com perfil gerado" },
                { value: "sem", label: "Sem perfil" },
              ]}
            />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Carregando…</div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="font-medium text-[#1A0010]">Nenhuma cliente cadastrada ainda.</p>
            </div>
          ) : (
            <ClientesTable clientes={filtradas} onSelect={setSelecionada} />
          )}
        </div>
      </div>

      <ClienteDrawer cliente={selecionada} onClose={() => setSelecionada(null)} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
