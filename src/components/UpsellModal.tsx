import { useEffect, useState } from "react";
import { Search, Scale, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AsaasPaymentForm } from "@/components/checkout/AsaasPaymentForm";

interface UpsellModalProps {
  open: boolean;
  onClose: () => void;
  tipo: "perguntas" | "perfil";
  userEmail: string | null;
  userId: string | null;
  onRecargaConfirmada?: () => void | Promise<void>;
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function UpsellModal({
  open,
  onClose,
  tipo,
  userEmail,
  userId,
  onRecargaConfirmada,
}: UpsellModalProps) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);
  const [etapa, setEtapa] = useState<"intro" | "dados" | "pagamento">("intro");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEtapa("intro");
    setErro(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    // Carrega CPF/telefone/nome do profile se já existirem
    if (userId) {
      setCarregandoPerfil(true);
      void supabase
        .from("profiles")
        .select("full_name, cpf, telefone")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setNome(data.full_name ?? "");
            setCpf(data.cpf ? maskCPF(data.cpf) : "");
            setTelefone(data.telefone ? maskPhone(data.telefone) : "");
          }
          setCarregandoPerfil(false);
        });
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, userId]);

  if (!open) return null;

  const isPerguntas = tipo === "perguntas";
  const Icon = isPerguntas ? Search : Scale;
  const titulo = isPerguntas
    ? "Você usou todos os seus tira-dúvidas!"
    : "Limite de gerações de perfil atingido";
  const subtitulo = isPerguntas
    ? "Mas a boa notícia é que você pode continuar."
    : "Adquira o pacote extra para refazer seu perfil.";

  const irParaDados = () => {
    if (!userEmail) {
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }
    if (cpf.replace(/\D/g, "").length === 11 && telefone.replace(/\D/g, "").length >= 10 && nome.trim()) {
      setEtapa("pagamento");
    } else {
      setEtapa("dados");
    }
  };

  const confirmarDados = () => {
    setErro(null);
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (cpf.replace(/\D/g, "").length !== 11) return setErro("Informe um CPF válido.");
    if (telefone.replace(/\D/g, "").length < 10) return setErro("Informe um celular válido.");
    setEtapa("pagamento");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", animation: "fadeIn 200ms ease-out" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[520px] max-h-[92vh] overflow-y-auto"
        style={{ borderRadius: 16, padding: 28, animation: "scaleIn 220ms ease-out" }}
      >
        {etapa === "intro" && (
          <>
            <div className="text-center mb-3">
              <Icon className="mx-auto text-[#552736]" style={{ width: 56, height: 56 }} />
            </div>
            <h2 className="text-xl font-bold text-[#6B0F4B] text-center mb-2">{titulo}</h2>
            <p className="text-sm text-gray-600 text-center mb-5">{subtitulo}</p>

            <div
              className="text-white p-5 mb-5"
              style={{
                borderRadius: 12,
                background: "linear-gradient(135deg, #6B0F4B 0%, #552736 100%)",
              }}
            >
              <p className="text-sm font-semibold mb-2">✨ Recarga Jamais Enganada</p>
              <ul className="text-sm space-y-1 mb-3 opacity-95">
                <li>+ 10 tira-dúvidas jurídicos</li>
                <li>+ 1 geração de perfil</li>
              </ul>
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: 32, fontWeight: 700 }}>R$ 29,90</span>
                <span className="text-xs opacity-80">pagamento único</span>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {[
                "+10 novos tira-dúvidas jurídicos",
                "+1 nova geração de perfil",
                "Pix com confirmação imediata ou cartão em até 3x",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#0F7B5A]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {erro && (
              <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md mb-3">
                {erro}
              </div>
            )}

            <button
              onClick={irParaDados}
              disabled={carregandoPerfil}
              className="w-full text-white font-semibold py-3 rounded-md hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: "#A8006E" }}
            >
              {carregandoPerfil ? "Carregando…" : "Quero continuar por R$ 29,90"}
            </button>

            <button
              onClick={onClose}
              className="w-full text-sm text-gray-400 mt-3 hover:text-gray-600 transition"
            >
              Agora não
            </button>
          </>
        )}

        {etapa === "dados" && (
          <>
            <button
              onClick={() => setEtapa("intro")}
              className="text-xs text-gray-500 hover:text-[#6B0F4B] underline mb-3"
            >
              ← Voltar
            </button>
            <h2 className="text-lg font-bold text-[#6B0F4B] mb-1">Confirme seus dados</h2>
            <p className="text-xs text-gray-600 mb-4">
              O Asaas precisa de CPF e celular para emitir a cobrança.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                  <input
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Celular</label>
                  <input
                    inputMode="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  />
                </div>
              </div>
              {erro && (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">{erro}</div>
              )}
              <button
                onClick={confirmarDados}
                className="w-full text-white font-semibold py-3 rounded-md hover:opacity-90 transition"
                style={{ backgroundColor: "#A8006E" }}
              >
                Continuar para pagamento →
              </button>
            </div>
          </>
        )}

        {etapa === "pagamento" && userEmail && (
          <>
            <button
              onClick={() => setEtapa(cpf && telefone ? "intro" : "dados")}
              className="text-xs text-gray-500 hover:text-[#6B0F4B] underline mb-3"
            >
              ← Voltar
            </button>
            <h2 className="text-lg font-bold text-[#6B0F4B] mb-1">
              Recarga — R$ 29,90
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Escolha como prefere pagar. A confirmação é automática.
            </p>
            <AsaasPaymentForm
              tipo="recarga"
              dados={{ nome: nome.trim(), email: userEmail, cpf, telefone }}
              onConfirmado={() => {
                void onRecargaConfirmada?.();
                onClose();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default UpsellModal;
