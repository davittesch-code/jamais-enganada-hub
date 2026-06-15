import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminConfiguracoes,
});

type Aba = "plataforma" | "asaas" | "conta";

function AdminConfiguracoes() {
  const { profile, user } = useAuth();
  const [aba, setAba] = useState<Aba>("plataforma");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [savingPlat, setSavingPlat] = useState(false);
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [nome, setNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [modalSenha, setModalSenha] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("configuracoes").select("chave, valor");
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { chave: string; valor: string | null }) => {
        map[r.chave] = r.valor ?? "";
      });
      setConfig(map);
    })();
  }, []);

  useEffect(() => {
    if (profile?.full_name) setNome(profile.full_name);
  }, [profile?.full_name]);

  const upsert = async (chave: string, valor: string) => {
    return supabase.from("configuracoes").upsert({ chave, valor }, { onConflict: "chave" });
  };

  const salvarPlataforma = async () => {
    setSavingPlat(true);
    const results = await Promise.all([
      upsert("preco_base", config.preco_base ?? ""),
      upsert("preco_upsell", config.preco_upsell ?? ""),
      upsert("whatsapp_suporte", config.whatsapp_suporte ?? ""),
    ]);
    setSavingPlat(false);
    if (results.some((r) => r.error)) toast.error("Falha ao salvar");
    else toast.success("Configurações salvas");
  };

  const salvarAsaas = async () => {
    setSavingAsaas(true);
    const { error } = await upsert("asaas_api_key", config.asaas_api_key ?? "");
    setSavingAsaas(false);
    if (error) toast.error("Falha");
    else toast.success("API Key salva");
  };

  const salvarNome = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nome })
      .eq("id", user.id);
    if (error) toast.error("Falha");
    else toast.success("Nome atualizado");
  };

  const alterarSenha = async () => {
    if (novaSenha.length < 6) return toast.error("Mínimo 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) toast.error(error.message);
    else {
      toast.success("Senha alterada");
      setModalSenha(false);
      setNovaSenha("");
    }
  };

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook`;
  const copiar = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const Tab = ({ id, label }: { id: Aba; label: string }) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        aba === id ? "border-[#A8006E] text-[#A8006E]" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header
        className="px-10 py-6 text-white"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <h1 className="text-[22px] font-bold">Configurações</h1>
      </header>

      <div className="p-6 lg:p-10 max-w-3xl">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b px-4 flex">
            <Tab id="plataforma" label="Plataforma" />
            <Tab id="asaas" label="Integração Asaas" />
            <Tab id="conta" label="Conta" />
          </div>

          <div className="p-6">
            {aba === "plataforma" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A0010] mb-1">
                    Preço base (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.preco_base ?? ""}
                    onChange={(e) => setConfig({ ...config, preco_base: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A0010] mb-1">
                    Preço upsell (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.preco_upsell ?? ""}
                    onChange={(e) => setConfig({ ...config, preco_upsell: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A0010] mb-1">
                    WhatsApp suporte padrão
                  </label>
                  <input
                    type="text"
                    value={config.whatsapp_suporte ?? ""}
                    onChange={(e) => setConfig({ ...config, whatsapp_suporte: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="5511999999999"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usado quando cliente não tem advogada vinculada
                  </p>
                </div>
                <button
                  onClick={() => void salvarPlataforma()}
                  disabled={savingPlat}
                  className="px-4 py-2 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90 disabled:opacity-40"
                >
                  {savingPlat ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}

            {aba === "asaas" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A0010] mb-1">
                    API Key do Asaas
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="password"
                      value={config.asaas_api_key ?? ""}
                      onChange={(e) => setConfig({ ...config, asaas_api_key: e.target.value })}
                      className="flex-1 border rounded-md px-3 py-2 text-sm font-mono"
                      placeholder="$aas_..."
                    />
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={
                        config.asaas_api_key
                          ? { background: "#DCFCE7", color: "#16A34A" }
                          : { background: "#F3F4F6", color: "#6B7280" }
                      }
                    >
                      {config.asaas_api_key ? "Configurado" : "Não configurado"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Encontre em app.asaas.com → Integrações → API Key
                  </p>
                </div>

                <div className="bg-[#FDF6F9] border border-[#A8006E]/30 rounded-md p-3">
                  <p className="text-xs font-medium text-[#552736] mb-2">
                    Configure este endereço no Asaas como webhook:
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 truncate">
                      {webhookUrl}
                    </code>
                    <button
                      onClick={() => void copiar()}
                      className="p-2 hover:bg-white rounded-md"
                      aria-label="Copiar"
                    >
                      {copiado ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => void salvarAsaas()}
                  disabled={savingAsaas}
                  className="px-4 py-2 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90 disabled:opacity-40"
                >
                  {savingAsaas ? "Salvando..." : "Salvar API Key"}
                </button>
              </div>
            )}

            {aba === "conta" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A0010] mb-1">Nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A0010] mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
                  />
                </div>
                <button
                  onClick={() => void salvarNome()}
                  className="px-4 py-2 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90"
                >
                  Salvar nome
                </button>

                <hr />

                <button
                  onClick={() => setModalSenha(true)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
                >
                  Alterar senha
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalSenha && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3">
            <h3 className="font-bold text-[#1A0010]">Alterar senha</h3>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setModalSenha(false); setNovaSenha(""); }}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => void alterarSenha()}
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
