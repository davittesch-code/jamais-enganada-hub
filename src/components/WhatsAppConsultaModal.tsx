import { useEffect } from "react";
import { MessageCircle, AlertCircle, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function WhatsAppConsultaModal({ open, onClose, onConfirm }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", animation: "fadeIn 200ms ease-out" }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.92) } to { opacity: 1; transform: scale(1) } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[460px] relative"
        style={{ borderRadius: 16, padding: 28, animation: "scaleIn 220ms ease-out" }}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#FDF6F9" }}
        >
          <AlertCircle className="w-7 h-7" style={{ color: "#6B0F4B" }} />
        </div>

        <h2 className="text-lg font-bold text-center mb-2" style={{ color: "#6B0F4B" }}>
          Antes de falar com a advogada
        </h2>
        <p className="text-sm text-gray-700 text-center leading-relaxed mb-4">
          Ao continuar, você iniciará o agendamento de uma{" "}
          <strong>consulta jurídica com uma advogada parceira</strong>.
        </p>

        <div
          className="rounded-lg p-4 mb-5 text-sm"
          style={{ backgroundColor: "#FEF9C3", border: "1px solid #D97706", color: "#854D0E" }}
        >
          <p className="font-semibold mb-1">⚠️ Este atendimento possui custo</p>
          <p className="leading-relaxed">
            Os valores e condições serão informados pela própria advogada no atendimento via
            WhatsApp, antes de qualquer compromisso.
          </p>
        </div>

        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle className="w-5 h-5" />
          Entendi, continuar para o WhatsApp
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm text-gray-500 mt-3 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default WhatsAppConsultaModal;
