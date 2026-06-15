import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreVertical, Download, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClienteAdminDrawer } from "@/components/admin/ClienteAdminDrawer";

export const Route = createFileRoute("/admin/clientes")({
  component: AdminClientes,
});

interface Cliente {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  queries_used: number;
  queries_limit: number;
  perfil_generations_used: number;
  perfil_generations_limit: number;
  tem_perfil: boolean;
  nivel_vulnerabilidade: string;
  advogado_id: string | null;
  advogado_nome: string;
}

type Filtro =
  | "todas"
  | "ativas"
  | "pendentes"
  | "inativas"
  | "com_perfil"
  | "sem_perfil"
  | "vuln_alta";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "ativas", label: "Ativas" },
  { id: "pendentes", label: "Pendentes" },
  { id: "inativas", label: "Inativas" },
  { id: "com_perfil", label: "Com perfil" },
  { id: "sem_perfil", label: "Sem perfil" },
  { id: "vuln_alta", label: "Vulnerabilidade alta" },
];

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

function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [drawerCliente, setDrawerCliente] = useState<Cliente | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [notaModal, setNotaModal] = useState<{ cliente: Cliente; nota: string } | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_all_clientes");
    if (error) toast.error("Falha ao carregar clientes");
    setClientes((data as unknown as Cliente[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return clientes.filter((c) => {
      if (termo) {
        const m = (c.full_name ?? "").toLowerCase().includes(termo) ||
          (c.email ?? "").toLowerCase().includes(termo);
        if (!m) return false;
      }
      switch (filtro) {
        case "ativas":
          return c.status === "ativo";
        case "pendentes":
          return c.status === "pendente";
        case "inativas":
          return c.status === "inativo";
        case "com_perfil":
          return c.tem_perfil;
        case "sem_perfil":
          return !c.tem_perfil;
        case "vuln_alta":
          return c.nivel_vulnerabilidade === "alto";
        default:
          return true;
      }
    });
  }, [clientes, busca, filtro]);

  const toggleSel = (id: string) => {
    const n = new Set(selecionadas);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelecionadas(n);
  };

  const toggleSelAll = () => {
    if (selecionadas.size === filtradas.length) setSelecionadas(new Set());
    else setSelecionadas(new Set(filtradas.map((c) => c.id)));
  };

  const mudarStatus = async (ids: string[], status: "ativo" | "inativo") => {
    const { error } = await supabase.from("profiles").update({ status }).in("id", ids);
    if (error) {
      toast.error(`Falha ao atualizar: ${error.message}`);
      return;
    }
    toast.success(`${ids.length} cliente(s) atualizada(s)`);
    setSelecionadas(new Set());
    void carregar();
  };

  const adicionarNota = async () => {
    if (!notaModal || !notaModal.nota.trim()) return;
    const { error } = await supabase.from("suporte_notas").insert({
      cliente_id: notaModal.cliente.id,
      nota: notaModal.nota.trim(),
    });
    if (error) {
      toast.error("Falha ao salvar nota");
      return;
    }
    toast.success("Nota adicionada");
    setNotaModal(null);
  };

  const exportarCsv = () => {
    const sel = clientes.filter((c) => selecionadas.has(c.id));
    const linhas = [
      ["nome", "email", "status", "cadastro", "advogada", "perfil", "vulnerabilidade", "perguntas"].join(","),
      ...sel.map((c) =>
        [
          `"${(c.full_name ?? "").replace(/"/g, '""')}"`,
          c.email ?? "",
          c.status,
          new Date(c.created_at).toLocaleDateString("pt-BR"),
          `"${c.advogado_nome}"`,
          c.tem_perfil ? "sim" : "nao",
          c.nivel_vulnerabilidade,
          `${c.queries_used}/${c.queries_limit}`,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([linhas], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header
        className="px-10 py-6 text-white"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <h1 className="text-[22px] font-bold">Clientes</h1>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          {clientes.length} cadastradas
        </p>
      </header>

      <div className="p-6 lg:p-10 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email"
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={
                  filtro === f.id
                    ? { background: "#A8006E", color: "white", borderColor: "#A8006E" }
                    : { background: "white", color: "#552736", borderColor: "#E5E7EB" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={filtradas.length > 0 && selecionadas.size === filtradas.length}
                      onChange={toggleSelAll}
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Nome / Email</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Advogada</th>
                  <th className="px-3 py-3 font-medium">Perfil</th>
                  <th className="px-3 py-3 font-medium">Vulnerab.</th>
                  <th className="px-3 py-3 font-medium">Perguntas</th>
                  <th className="px-3 py-3 font-medium">Cadastro</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-gray-500">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loading && filtradas.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selecionadas.has(c.id)}
                        onChange={() => toggleSel(c.id)}
                      />
                    </td>
                    <td className="px-3 py-3 cursor-pointer" onClick={() => setDrawerCliente(c)}>
                      <div className="font-medium text-[#1A0010]">{c.full_name || "—"}</div>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
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
                    <td className="px-3 py-3"><VulnBadge nivel={c.nivel_vulnerabilidade} /></td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {c.queries_used}/{c.queries_limit}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-3 relative">
                      <button
                        onClick={() => setMenuAberto(menuAberto === c.id ? null : c.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {menuAberto === c.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuAberto(null)}
                          />
                          <div className="absolute right-2 top-10 z-20 bg-white border rounded-md shadow-lg py-1 w-44">
                            <button
                              onClick={() => { setDrawerCliente(c); setMenuAberto(null); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Ver detalhes
                            </button>
                            {c.status !== "ativo" && (
                              <button
                                onClick={() => { void mudarStatus([c.id], "ativo"); setMenuAberto(null); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                Ativar conta
                              </button>
                            )}
                            {c.status !== "inativo" && (
                              <button
                                onClick={() => { void mudarStatus([c.id], "inativo"); setMenuAberto(null); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                              >
                                Desativar conta
                              </button>
                            )}
                            <button
                              onClick={() => { setNotaModal({ cliente: c, nota: "" }); setMenuAberto(null); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Adicionar nota
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filtradas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-gray-500">
                      Nenhuma cliente encontrada com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selecionadas.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#1A0010] text-white rounded-full shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selecionadas.size} selecionada(s)</span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => void mudarStatus(Array.from(selecionadas), "ativo")}
            className="text-sm hover:text-green-300"
          >
            Ativar
          </button>
          <button
            onClick={() => void mudarStatus(Array.from(selecionadas), "inativo")}
            className="text-sm hover:text-red-300"
          >
            Desativar
          </button>
          <button
            onClick={exportarCsv}
            className="text-sm flex items-center gap-1 hover:text-[#FBC8DE]"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => setSelecionadas(new Set())}
            className="text-sm text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {drawerCliente && (
        <ClienteAdminDrawer
          cliente={drawerCliente}
          onClose={() => setDrawerCliente(null)}
          onUpdated={() => { void carregar(); }}
        />
      )}

      {notaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-3">
            <h3 className="font-bold text-[#1A0010]">Nota de suporte</h3>
            <p className="text-xs text-gray-500">
              Para {notaModal.cliente.full_name || notaModal.cliente.email}
            </p>
            <textarea
              value={notaModal.nota}
              onChange={(e) => setNotaModal({ ...notaModal, nota: e.target.value })}
              rows={4}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
              placeholder="Escreva a nota..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNotaModal(null)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => void adicionarNota()}
                className="px-4 py-2 text-sm bg-[#A8006E] text-white rounded-md hover:opacity-90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
