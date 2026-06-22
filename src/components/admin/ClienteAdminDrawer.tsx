import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Cliente {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  consultas_used: number;
  consultas_limit: number;
  perfil_generations_used: number;
  perfil_generations_limit: number;
  tem_perfil: boolean;
  nivel_vulnerabilidade: string;
  advogado_id: string | null;
  advogado_nome: string;
}

interface Props {
  cliente: Cliente;
  onClose: () => void;
  onUpdated: () => void;
}

type Aba = "perfil" | "uso" | "advogada" | "suporte";

interface PerfilData {
  areas: Record<string, { status?: string; titulo?: string; descricao?: string }>;
  extra_data: { resumo_geral?: string; nivel_vulnerabilidade?: string; frase_de_forca?: string };
  generated_at: string;
}

interface Pergunta { id: string; question: string; area: string | null; created_at: string; }
interface Advogada { id: string; nome: string; oab: string; whatsapp: string; }
interface Nota { id: string; nota: string; created_at: string; }

export function ClienteAdminDrawer({ cliente, onClose, onUpdated }: Props) {
  const [aba, setAba] = useState<Aba>("perfil");
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [advogadas, setAdvogadas] = useState<Advogada[]>([]);
  const [advogadaSel, setAdvogadaSel] = useState<string>(cliente.advogado_id ?? "");
  const [notas, setNotas] = useState<Nota[]>([]);
  const [novaNota, setNovaNota] = useState("");
  const [cli, setCli] = useState(cliente);

  useEffect(() => {
    void (async () => {
      const [pd, qs, advs, ns] = await Promise.all([
        supabase.from("profile_data").select("areas, extra_data, generated_at").eq("user_id", cliente.id).maybeSingle(),
        supabase.from("queries").select("id, question, area, created_at").eq("user_id", cliente.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("advogados").select("id, nome, oab, whatsapp").eq("ativo", true).order("nome"),
        supabase.from("suporte_notas").select("id, nota, created_at").eq("cliente_id", cliente.id).order("created_at", { ascending: false }),
      ]);
      setPerfil((pd.data as unknown as PerfilData) ?? null);
      setPerguntas((qs.data ?? []) as Pergunta[]);
      setAdvogadas((advs.data ?? []) as Advogada[]);
      setNotas((ns.data ?? []) as Nota[]);
    })();
  }, [cliente.id]);

  const resetarPerfil = async () => {
    if (!confirm("Confirma resetar o perfil desta cliente?")) return;
    await supabase.from("profile_data").delete().eq("user_id", cliente.id);
    await supabase.from("onboarding_responses").delete().eq("user_id", cliente.id);
    toast.success("Perfil resetado");
    setPerfil(null);
    onUpdated();
  };

  const adicionarLimite = async (campo: "consultas_limit" | "perfil_generations_limit", inc: number) => {
    const novoValor =
      campo === "consultas_limit" ? cli.consultas_limit + inc : cli.perfil_generations_limit + inc;
    const update: { consultas_limit?: number; perfil_generations_limit?: number } = {};
    update[campo] = novoValor;
    const { error } = await supabase.from("profiles").update(update).eq("id", cliente.id);
    if (error) return toast.error("Falha");
    toast.success("Limite atualizado");
    setCli({ ...cli, [campo]: novoValor });
    onUpdated();
  };

  const salvarAdvogada = async () => {
    if (!advogadaSel) return;
    const { error } = await supabase
      .from("profiles")
      .update({ advogado_id: advogadaSel })
      .eq("id", cliente.id);
    if (error) return toast.error(`Falha: ${error.message}`);
    toast.success("Vínculo salvo");
    onUpdated();
  };

  const salvarNota = async () => {
    if (!novaNota.trim()) return;
    const { data, error } = await supabase
      .from("suporte_notas")
      .insert({ cliente_id: cliente.id, nota: novaNota.trim() })
      .select("id, nota, created_at")
      .single();
    if (error) return toast.error("Falha");
    setNotas([data as Nota, ...notas]);
    setNovaNota("");
    toast.success("Nota salva");
  };

  const advSel = advogadas.find((a) => a.id === cli.advogado_id);

  const TabBtn = ({ id, label }: { id: Aba; label: string }) => (
    <button
      onClick={() => setAba(id)}
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        aba === id ? "border-[#A8006E] text-[#A8006E]" : "border-transparent text-gray-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full sm:w-[520px] bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b">
          <div className="flex items-start justify-between p-5">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-2xl font-bold">
                {(cli.full_name ?? cli.email ?? "?")[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-[#1A0010]">{cli.full_name || "—"}</h2>
                <p className="text-sm text-gray-500">{cli.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={
                      cli.status === "ativo"
                        ? { background: "#DCFCE7", color: "#16A34A" }
                        : cli.status === "pendente"
                        ? { background: "#FEF9C3", color: "#D97706" }
                        : { background: "#F3F4F6", color: "#6B7280" }
                    }
                  >
                    ● {cli.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(cli.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex px-3">
            <TabBtn id="perfil" label="Perfil" />
            <TabBtn id="uso" label="Uso" />
            <TabBtn id="advogada" label="Advogada" />
            <TabBtn id="suporte" label="Suporte" />
          </div>
        </div>

        <div className="p-5">
          {aba === "perfil" && (
            <div className="space-y-4">
              {perfil ? (
                <>
                  <div>
                    <span
                      className="inline-block text-xs font-bold px-3 py-1 rounded-full"
                      style={
                        perfil.extra_data.nivel_vulnerabilidade === "alto"
                          ? { background: "#FEE2E2", color: "#DC2626" }
                          : perfil.extra_data.nivel_vulnerabilidade === "medio"
                          ? { background: "#FEF9C3", color: "#D97706" }
                          : { background: "#DCFCE7", color: "#16A34A" }
                      }
                    >
                      Vulnerabilidade: {perfil.extra_data.nivel_vulnerabilidade}
                    </span>
                  </div>
                  {perfil.extra_data.resumo_geral && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {perfil.extra_data.resumo_geral}
                    </p>
                  )}
                  {perfil.extra_data.frase_de_forca && (
                    <p className="italic text-[#A8006E] text-sm">
                      &ldquo;{perfil.extra_data.frase_de_forca}&rdquo;
                    </p>
                  )}
                  <div className="space-y-2">
                    {Object.entries(perfil.areas ?? {}).map(([k, v]) => (
                      <div key={k} className="border rounded-md p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{v.titulo || k}</span>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={
                              v.status === "critico"
                                ? { background: "#FEE2E2", color: "#DC2626" }
                                : v.status === "atencao"
                                ? { background: "#FEF9C3", color: "#D97706" }
                                : { background: "#DCFCE7", color: "#16A34A" }
                            }
                          >
                            {v.status}
                          </span>
                        </div>
                        {v.descricao && (
                          <p className="text-xs text-gray-600 mt-1">{v.descricao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Gerado em {new Date(perfil.generated_at).toLocaleString("pt-BR")}
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <p className="mb-4">Perfil ainda não gerado</p>
                  <button
                    onClick={() => void resetarPerfil()}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50"
                  >
                    Resetar e forçar novo tira-dúvidas
                  </button>
                </div>
              )}
            </div>
          )}

          {aba === "uso" && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Perguntas</span>
                  <span className="font-medium">{cli.consultas_used}/{cli.consultas_limit}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (cli.consultas_used / Math.max(1, cli.consultas_limit)) * 100)}%`,
                      background:
                        cli.consultas_used >= cli.consultas_limit
                          ? "#DC2626"
                          : cli.consultas_used >= 3
                          ? "#D97706"
                          : "#16A34A",
                    }}
                  />
                </div>
                <button
                  onClick={() => void adicionarLimite("consultas_limit", 5)}
                  className="mt-2 text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
                >
                  +5 perguntas
                </button>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Gerações de perfil</span>
                  <span className="font-medium">
                    {cli.perfil_generations_used}/{cli.perfil_generations_limit}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#A8006E] rounded-full"
                    style={{
                      width: `${Math.min(100, (cli.perfil_generations_used / Math.max(1, cli.perfil_generations_limit)) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => void adicionarLimite("perfil_generations_limit", 1)}
                  className="mt-2 text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
                >
                  +1 geração
                </button>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Últimas perguntas</h4>
                {perguntas.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem perguntas ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {perguntas.map((p) => (
                      <li key={p.id} className="text-xs bg-gray-50 p-2 rounded">
                        <p className="line-clamp-2">{p.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {p.area && (
                            <span className="text-[10px] bg-[#FDF6F9] text-[#A8006E] px-1.5 py-0.5 rounded">
                              {p.area}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {aba === "advogada" && (
            <div className="space-y-4">
              {advSel ? (
                <div className="bg-[#FDF6F9] rounded-md p-3 text-sm">
                  <p className="font-semibold">{advSel.nome}</p>
                  <p className="text-xs text-gray-600">OAB: {advSel.oab}</p>
                  <p className="text-xs text-gray-600">WhatsApp: {advSel.whatsapp}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sem advogada vinculada.</p>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Trocar / vincular</label>
                <select
                  value={advogadaSel}
                  onChange={(e) => setAdvogadaSel(e.target.value)}
                  className="w-full border rounded-md px-2 py-2 text-sm"
                >
                  <option value="">— Selecione —</option>
                  {advogadas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.oab})</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => void salvarAdvogada()}
                disabled={!advogadaSel}
                className="px-4 py-2 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90 disabled:opacity-40"
              >
                Salvar vínculo
              </button>
            </div>
          )}

          {aba === "suporte" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  placeholder="Anotar atendimento..."
                  className="w-full border rounded-md p-2 text-sm"
                />
                <button
                  onClick={() => void salvarNota()}
                  disabled={!novaNota.trim()}
                  className="px-4 py-1.5 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90 disabled:opacity-40"
                >
                  Adicionar nota
                </button>
              </div>
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
          )}
        </div>
      </div>
    </div>
  );
}
