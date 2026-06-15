import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/suporte")({
  component: AdminSuporte,
});

interface Cliente {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  queries_used: number;
  queries_limit: number;
  tem_perfil: boolean;
  nivel_vulnerabilidade: string;
  advogado_id: string | null;
  advogado_nome: string;
}

interface Advogada { id: string; nome: string; oab: string; }
interface Nota { id: string; nota: string; created_at: string; }

interface CasoPrioridade {
  cliente: Cliente;
  motivo: string;
  cor: { bg: string; color: string };
  prioridade: number;
}

function calcCasos(clientes: Cliente[]): CasoPrioridade[] {
  const seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return clientes
    .map((c) => {
      if (c.status === "pendente")
        return { cliente: c, motivo: "Aguardando pagamento", cor: { bg: "#FEF9C3", color: "#D97706" }, prioridade: 1 };
      if (c.nivel_vulnerabilidade === "alto")
        return { cliente: c, motivo: "Vulnerabilidade alta", cor: { bg: "#FEE2E2", color: "#DC2626" }, prioridade: 2 };
      if (!c.tem_perfil && new Date(c.created_at).getTime() < seteDias)
        return { cliente: c, motivo: "Sem perfil há +7 dias", cor: { bg: "#FED7AA", color: "#EA580C" }, prioridade: 3 };
      if (!c.advogado_id)
        return { cliente: c, motivo: "Sem advogada", cor: { bg: "#F3F4F6", color: "#6B7280" }, prioridade: 4 };
      return null;
    })
    .filter((x): x is CasoPrioridade => x !== null)
    .sort((a, b) => a.prioridade - b.prioridade);
}

function AdminSuporte() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [advogadas, setAdvogadas] = useState<Advogada[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [novaNota, setNovaNota] = useState("");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Cliente | null>(null);
  const [advogadaSel, setAdvogadaSel] = useState<string>("");

  const carregar = async () => {
    const [{ data: cls }, { data: advs }] = await Promise.all([
      supabase.rpc("get_all_clientes"),
      supabase.from("advogados").select("id, nome, oab").eq("ativo", true).order("nome"),
    ]);
    setClientes((cls as unknown as Cliente[]) ?? []);
    setAdvogadas((advs ?? []) as Advogada[]);
  };

  const carregarNotas = async (id: string) => {
    const { data } = await supabase
      .from("suporte_notas")
      .select("id, nota, created_at")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false });
    setNotas((data ?? []) as Nota[]);
  };

  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    if (!sel) {
      setNotas([]);
      setAdvogadaSel("");
      return;
    }
    setAdvogadaSel(sel.advogado_id ?? "");
    void carregarNotas(sel.id);
  }, [sel]);

  const casos = useMemo(() => calcCasos(clientes), [clientes]);
  const casosFiltrados = useMemo(() => {
    const t = busca.toLowerCase().trim();
    if (!t) return casos;
    return casos.filter((c) =>
      (c.cliente.full_name ?? "").toLowerCase().includes(t) ||
      (c.cliente.email ?? "").toLowerCase().includes(t)
    );
  }, [casos, busca]);

  const ativar = async () => {
    if (!sel) return;
    const { error } = await supabase.from("profiles").update({ status: "ativo" }).eq("id", sel.id);
    if (error) return toast.error("Falha");
    toast.success("Cliente ativada");
    void carregar();
    setSel({ ...sel, status: "ativo" });
  };

  const vincular = async () => {
    if (!sel || !advogadaSel) return;
    const { error } = await supabase
      .from("profiles")
      .update({ advogado_id: advogadaSel })
      .eq("id", sel.id);
    if (error) return toast.error(`Falha: ${error.message}`);
    toast.success("Advogada vinculada");
    void carregar();
  };

  const salvarNota = async () => {
    if (!sel || !novaNota.trim()) return;
    const { error } = await supabase
      .from("suporte_notas")
      .insert({ cliente_id: sel.id, nota: novaNota.trim() });
    if (error) return toast.error("Falha ao salvar");
    setNovaNota("");
    toast.success("Nota adicionada");
    void carregarNotas(sel.id);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header
        className="px-10 py-6 text-white"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <h1 className="text-[22px] font-bold">Suporte</h1>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          {casos.length} caso(s) precisam de atenção
        </p>
      </header>

      <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-[38%_1fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b space-y-3">
            <h2 className="font-bold text-[#1A0010] text-sm">Casos que precisam de atenção</h2>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
              />
            </div>
          </div>
          <ul className="divide-y max-h-[600px] overflow-y-auto">
            {casosFiltrados.map((c) => (
              <li
                key={c.cliente.id + c.motivo}
                onClick={() => setSel(c.cliente)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${sel?.id === c.cliente.id ? "bg-[#FDF6F9]" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {(c.cliente.full_name ?? c.cliente.email ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-[#1A0010] truncate">
                      {c.cliente.full_name || c.cliente.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: c.cor.bg, color: c.cor.color }}
                      >
                        {c.motivo}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.cliente.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {casosFiltrados.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                Nenhum caso pendente. ✨
              </li>
            )}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          {!sel ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-400">
              <Headphones className="w-12 h-12 mb-3" />
              <p className="text-sm">Selecione uma cliente</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1A0010]">{sel.full_name || "—"}</h2>
                <p className="text-sm text-gray-500">{sel.email}</p>
                <span
                  className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={
                    sel.status === "ativo"
                      ? { background: "#DCFCE7", color: "#16A34A" }
                      : sel.status === "pendente"
                      ? { background: "#FEF9C3", color: "#D97706" }
                      : { background: "#F3F4F6", color: "#6B7280" }
                  }
                >
                  ● {sel.status}
                </span>
              </div>

              <div className="bg-[#FDF6F9] rounded-md p-3 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Vulnerabilidade</div>
                    <div className="font-medium">{sel.nivel_vulnerabilidade}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Perfil</div>
                    <div className="font-medium">{sel.tem_perfil ? "✓ Gerado" : "Pendente"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Perguntas</div>
                    <div className="font-medium">{sel.queries_used}/{sel.queries_limit}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-[#1A0010]">Ações rápidas</h3>
                {sel.status === "pendente" && (
                  <button
                    onClick={() => void ativar()}
                    className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Ativar conta
                  </button>
                )}
                <div className="flex gap-2">
                  <select
                    value={advogadaSel}
                    onChange={(e) => setAdvogadaSel(e.target.value)}
                    className="flex-1 border rounded-md px-2 py-2 text-sm"
                  >
                    <option value="">— Selecione advogada —</option>
                    {advogadas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome} ({a.oab})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => void vincular()}
                    disabled={!advogadaSel}
                    className="px-3 py-2 text-sm bg-[#A8006E] text-white rounded-md hover:opacity-90 disabled:opacity-40"
                  >
                    Vincular
                  </button>
                </div>
                {/* Reset de senha exige supabaseAdmin no servidor — feito pelo painel Supabase por enquanto. */}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-[#1A0010]">Nova nota</h3>
                <textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  placeholder="Anote o atendimento..."
                />
                <button
                  onClick={() => void salvarNota()}
                  disabled={!novaNota.trim()}
                  className="px-4 py-1.5 text-sm bg-[#A8006E] text-white rounded-md hover:opacity-90 disabled:opacity-40"
                >
                  Salvar nota
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-[#1A0010]">Histórico</h3>
                {notas.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem notas para esta cliente.</p>
                ) : (
                  <ul className="space-y-2">
                    {notas.map((n) => (
                      <li key={n.id} className="bg-gray-50 rounded-md p-3 text-sm">
                        <p className="whitespace-pre-wrap">{n.nota}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleString("pt-BR")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
