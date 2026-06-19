import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

/**
 * Banner exibido para clientes quando o acesso est\u00e1 prestes a expirar
 * ou j\u00e1 expirou. CTA reabre o checkout do produto "acesso_jamais_enganada".
 */
export function RenovacaoBanner() {
  const { user, profile } = useAuth();
  const [expiraEm, setExpiraEm] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== "cliente") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plano_expira_em")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data?.plano_expira_em) setExpiraEm(new Date(data.plano_expira_em));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.role]);

  if (!user || profile?.role !== "cliente" || !expiraEm) return null;

  const agora = new Date();
  const diasRestantes = Math.ceil((expiraEm.getTime() - agora.getTime()) / 86400000);
  const expirado = diasRestantes <= 0;
  const proximo = diasRestantes > 0 && diasRestantes <= 14;
  if (!expirado && !proximo) return null;

  const renovar = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await initializePaddle();
      const priceId = await getPaddlePriceId("acesso_jamais_enganada");
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email },
        customData: {
          email: user.email,
          user_id: user.id,
          nome: profile?.full_name ?? "",
          tipo_produto: "acesso",
        },
        settings: {
          displayMode: "overlay",
          locale: "pt-BR",
          successUrl: `${window.location.origin}/perfil?renovado=1`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`w-full px-4 py-3 text-sm flex items-center justify-center gap-3 ${
        expirado
          ? "bg-red-50 text-red-800 border-b border-red-200"
          : "bg-amber-50 text-amber-900 border-b border-amber-200"
      }`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        {expirado
          ? "Seu acesso expirou. Renove para continuar consultando."
          : `Seu acesso expira em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}.`}
      </span>
      <button
        onClick={renovar}
        disabled={loading}
        className="ml-2 rounded-md px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "#A8006E" }}
      >
        {loading ? "Abrindo…" : "Renovar acesso"}
      </button>
    </div>
  );
}
