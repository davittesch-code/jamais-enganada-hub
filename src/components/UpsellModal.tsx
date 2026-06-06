import { useEffect } from "react";
import { Search, Scale, Check } from "lucide-react";

interface UpsellModalProps {
  open: boolean;
  onClose: () => void;
  tipo: "perguntas" | "perfil";
  onConfirm: () => void;
}

export function UpsellModal({ open, onClose, tipo, onConfirm }: UpsellModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const isPerguntas = tipo === "perguntas";
  const Icon = isPerguntas ? Search : Scale;
  const titulo = isPerguntas
    ? "Você usou todas as suas consultas!"
    : "Limite de gerações de perfil atingido";
  const subtitulo = isPerguntas
    ? "Mas a boa notícia é que você pode continuar."
    : "Adquira o pacote extra para refazer seu perfil.";

  const beneficios = [
    "5 novas consultas jurídicas personalizadas",
    "Refaça seu perfil com novas informações",
    "Respostas baseadas na lei brasileira",
  ];

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
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: 16,
          padding: 32,
          animation: "scaleIn 220ms ease-out",
        }}
      >
        <div className="text-center mb-4">
          <Icon className="mx-auto text-[#A8006E]" style={{ width: 64, height: 64 }} />
        </div>

        <h2 className="text-xl font-bold text-[#6B0F4B] text-center mb-2">{titulo}</h2>
        <p className="text-sm text-gray-600 text-center mb-6">{subtitulo}</p>

        <div
          className="text-white p-5 mb-5"
          style={{
            borderRadius: 12,
            background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)",
          }}
        >
          <p className="text-sm font-semibold mb-2">✨ Pacote Extra</p>
          <ul className="text-sm space-y-1 mb-3 opacity-95">
            <li>+ 5 perguntas jurídicas</li>
            <li>+ 1 geração de perfil</li>
          </ul>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: 32, fontWeight: 700 }}>R$ 29,90</span>
            <span className="text-xs opacity-80">pagamento único</span>
          </div>
        </div>

        <ul className="space-y-2 mb-6">
          {beneficios.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#0F7B5A]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onConfirm}
          className="w-full text-white font-semibold py-3 rounded-md hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#A8006E" }}
        >
          Quero continuar por R$ 29,90
        </button>

        <button
          onClick={onClose}
          className="w-full text-sm text-gray-400 mt-3 hover:text-gray-600 transition-colors"
        >
          Agora não
        </button>

        <p className="text-xs text-gray-400 text-center mt-5">
          🔒 Pagamento seguro · Acesso imediato
        </p>
      </div>
    </div>
  );
}

export default UpsellModal;
