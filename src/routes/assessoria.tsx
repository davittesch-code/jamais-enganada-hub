import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Scale,
  MessageCircle,
  FileText,
  Shield,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/assessoria")({
  component: () => (
    <PrivateRoute>
      <AssessoriaPage />
    </PrivateRoute>
  ),
});

type AreaStatus = "ok" | "atencao" | "critico" | "nao_aplicavel";
interface AreaInfo {
  status: AreaStatus;
  resumo?: string;
}
interface AttentionPoint {
  area?: string;
  titulo: string;
  descricao: string;
  nivel: "alto" | "medio" | "baixo";
}
interface NextStep {
  ordem: number;
  area?: string;
  titulo: string;
  descricao: string;
  prazo?: string;
}
interface ProfileDataRow {
  attention_points: AttentionPoint[];
  next_steps: NextStep[];
  areas: Record<string, AreaInfo>;
  extra_data: { resumo_geral?: string };
}
interface Duvida {
  question: string;
  area: string | null;
  created_at: string;
}
interface AdvContato {
  full_name: string | null;
  whatsapp: string | null;
}

const onlyDigits = (s: string | null | undefined) => (s || "").replace(/\D+/g, "");

const NIVEL_TAG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  alto: { label: "🔴 Urgente — discutir primeiro", bg: "#FEE2E2", color: "#DC2626", border: "#DC2626" },
  medio: { label: "🟡 Importante", bg: "#FEF9C3", color: "#D97706", border: "#D97706" },
  baixo: { label: "🟢 Quando possível", bg: "#DCFCE7", color: "#16A34A", border: "#16A34A" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function AssessoriaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meuPerfil, setMeuPerfil] = useState<{ full_name: string | null; advogado_id: string | null } | null>(null);
  const [contatoAdv, setContatoAdv] = useState<AdvContato | null>(null);
  const [profileData, setProfileData] = useState<ProfileDataRow | null>(null);
  const [duvidas, setDuvidas] = useState<Duvida[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [perfilRes, advRes, pdRes, qRes] = await Promise.all([
        supabase.from("profiles").select("full_name, advogado_id").eq("id", user.id).single(),
        supabase.rpc("get_my_advogado_contact"),
        supabase
          .from("profile_data")
          .select("attention_points, next_steps, areas, extra_data")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("queries")
          .select("question, area, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setMeuPerfil(perfilRes.data ?? null);
      const advObj = advRes.data as { nome?: string | null; full_name?: string | null; whatsapp?: string | null } | null;
      setContatoAdv(advObj ? { full_name: advObj.nome ?? advObj.full_name ?? null, whatsapp: advObj.whatsapp ?? null } : null);
      if (pdRes.data) {
        setProfileData({
          attention_points: (pdRes.data.attention_points as unknown as AttentionPoint[]) ?? [],
          next_steps: (pdRes.data.next_steps as unknown as NextStep[]) ?? [],
          areas: (pdRes.data.areas as unknown as Record<string, AreaInfo>) ?? {},
          extra_data: (pdRes.data.extra_data as unknown as { resumo_geral?: string }) ?? {},
        });
      }
      setDuvidas((qRes.data as Duvida[] | null) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const temAdvogado = !!meuPerfil?.advogado_id && !!contatoAdv;
  const nomeAdvogada = contatoAdv?.full_name || "Advogada Parceira";
  const inicialAdv = (nomeAdvogada.trim()[0] || "A").toUpperCase();

  const handleWhatsApp = () => {
    if (!temAdvogado) return;
    const numero = onlyDigits(contatoAdv?.whatsapp) || "5511999999999";
    const areasCriticas = profileData?.areas
      ? Object.entries(profileData.areas)
          .filter(([, v]) => v?.status === "critico")
          .map(([k]) => k)
          .join(", ")
      : "";
    const resumo = profileData?.extra_data?.resumo_geral
      ? profileData.extra_data.resumo_geral.substring(0, 200) + "..."
      : "";
    const mensagem = encodeURIComponent(
      `Olá! Sou ${meuPerfil?.full_name || "sua cliente"}, cliente da plataforma Jamais Enganada.\n\n` +
        (areasCriticas ? `Meu perfil jurídico indica atenção nas áreas: ${areasCriticas}.\n\n` : "") +
        (resumo ? `${resumo}\n\n` : "") +
        `Gostaria de conversar sobre minha situação.`,
    );
    window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6F9] p-6 md:p-12 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  // Pautas: top 3 attention_points (alto > medio > baixo) + top 2 next_steps
  const orderNivel = { alto: 0, medio: 1, baixo: 2 } as const;
  const pontos = [...(profileData?.attention_points ?? [])]
    .sort((a, b) => (orderNivel[a.nivel] ?? 9) - (orderNivel[b.nivel] ?? 9))
    .slice(0, 3);
  const passos = [...(profileData?.next_steps ?? [])]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .slice(0, 2);

  type Pauta = {
    titulo: string;
    descricao: string;
    area?: string;
    nivel: "alto" | "medio" | "baixo";
  };
  const pautas: Pauta[] = [
    ...pontos.map((p) => ({
      titulo: p.titulo,
      descricao: p.descricao,
      area: p.area,
      nivel: p.nivel,
    })),
    ...passos.map((p) => ({
      titulo: p.titulo,
      descricao: p.descricao,
      area: p.area,
      nivel: "medio" as const,
    })),
  ];

  return (
    <div className="min-h-screen bg-[#FDF6F9]">
      {/* Banner sem advogada */}
      {!temAdvogado && (
        <div
          className="px-6 md:px-12 py-4 text-sm"
          style={{ backgroundColor: "#FEF9C3", borderBottom: "2px solid #D97706", color: "#854D0E" }}
        >
          <div className="max-w-5xl mx-auto flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Sua conta ainda não está vinculada a uma advogada parceira.</strong>{" "}
              Os botões de WhatsApp estão temporariamente desabilitados.
            </p>
          </div>
        </div>
      )}

      {/* SEÇÃO 1 — Hero */}
      <section
        className="px-6 md:px-12 py-12 text-white text-center"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <Scale className="w-12 h-12 mx-auto mb-4" strokeWidth={1.8} />
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          Sua Assessoria Jurídica Personalizada
        </h1>
        <p className="text-white/80 text-base max-w-2xl mx-auto mb-5 leading-relaxed">
          Aqui você encontra tudo preparado para conversar com sua advogada e resolver as questões do
          seu perfil.
        </p>
        <span
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-white"
          style={{ color: "#A8006E" }}
        >
          💜 Baseado no seu perfil jurídico
        </span>
      </section>

      <div className="px-4 md:px-12 py-10 max-w-5xl mx-auto space-y-8">
        {/* SEÇÃO 2 — Advogada responsável */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: "#6B0F4B" }}>
            👩‍⚖️ Sua advogada responsável
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold mb-3"
                style={{ backgroundColor: "#A8006E", fontSize: 32 }}
              >
                {inicialAdv}
              </div>
              <h3 className="font-bold text-xl text-[#6B0F4B]">{nomeAdvogada}</h3>
              <p className="text-sm text-gray-500 mb-3">Direito da Mulher e Família</p>
              {temAdvogado && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}
                >
                  ● Disponível para atendimento
                </span>
              )}
            </div>

            <div>
              <p className="text-gray-700 leading-relaxed mb-4">
                Sua advogada tem acesso ao seu perfil jurídico completo e está pronta para te ajudar a
                tomar as melhores decisões.
              </p>
              <div
                className="rounded-lg p-4 mb-5 text-sm"
                style={{ backgroundColor: "#FDF6F9", border: "1px solid #E8D0E0" }}
              >
                <p className="font-semibold mb-2" style={{ color: "#6B0F4B" }}>
                  Como funciona:
                </p>
                <ol className="space-y-1 text-gray-700 list-decimal list-inside">
                  <li>Clique em "Falar no WhatsApp"</li>
                  <li>A conversa já vai com um resumo do seu caso</li>
                  <li>Sua advogada responde com orientação personalizada</li>
                </ol>
              </div>

              {temAdvogado ? (
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar no WhatsApp agora
                </button>
              ) : (
                <>
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-semibold py-3.5 rounded-lg cursor-not-allowed"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Nenhuma advogada vinculada à sua conta
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Entre em contato com o suporte
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 3 — Pautas */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold mb-1" style={{ color: "#6B0F4B" }}>
            📋 Pautas para sua conversa
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Estes são os pontos mais importantes do seu perfil para discutir com sua advogada:
          </p>

          {!profileData ? (
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: "#FEF9C3", border: "1px solid #D97706" }}
            >
              <p className="text-sm text-[#854D0E] mb-3">
                ⚠️ Gere seu perfil jurídico primeiro para ver as pautas personalizadas.
              </p>
              <Link
                to="/perfil"
                className="inline-block text-white text-sm font-semibold px-4 py-2 rounded-lg"
                style={{ backgroundColor: "#A8006E" }}
              >
                Ir para Meu Perfil
              </Link>
            </div>
          ) : pautas.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma pauta urgente identificada no momento.</p>
          ) : (
            <div className="space-y-3">
              {pautas.map((p, i) => {
                const tag = NIVEL_TAG[p.nivel] ?? NIVEL_TAG.medio;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-4 border border-gray-100"
                    style={{ borderLeft: `4px solid ${tag.border}` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: "#A8006E" }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {p.area && (
                          <span className="inline-block text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-[#FDF6F9] text-[#A8006E] mb-1.5">
                            {p.area}
                          </span>
                        )}
                        <h4 className="font-bold text-[#6B0F4B] mb-1">{p.titulo}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{p.descricao}</p>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{ backgroundColor: tag.bg, color: tag.color }}
                        >
                          {tag.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SEÇÃO 4 — Dúvidas */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold mb-1" style={{ color: "#6B0F4B" }}>
            🔍 Dúvidas que você já pesquisou
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Leve essas dúvidas para aprofundar com sua advogada:
          </p>

          {duvidas.length === 0 ? (
            <div className="text-sm text-gray-600">
              <p className="mb-2">Você ainda não fez perguntas no tira-dúvidas.</p>
              <Link to="/pesquisa" className="font-semibold" style={{ color: "#A8006E" }}>
                Ir para Tira-dúvidas →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {duvidas.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100"
                  style={{ borderLeft: "4px solid #A8006E" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#6B0F4B] truncate">{d.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {d.area && (
                        <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#FDF6F9] text-[#A8006E]">
                          {d.area}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(d.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO 5 — Como funciona */}
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{ background: "linear-gradient(135deg, #FDF6F9 0%, #FFFFFF 100%)" }}
        >
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "#6B0F4B" }}>
            Como sua assessoria funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                Icon: FileText,
                color: "#A8006E",
                title: "Perfil analisado",
                text: "Sua advogada recebe seu perfil jurídico completo antes de qualquer conversa.",
              },
              {
                Icon: MessageCircle,
                color: "#25D366",
                title: "Contato direto",
                text: "Fale pelo WhatsApp com sua advogada de confiança, quando precisar.",
              },
              {
                Icon: Shield,
                color: "#A8006E",
                title: "Orientação segura",
                text: "Decisões importantes com base na lei e no seu caso específico — não conselhos genéricos.",
              },
            ].map(({ Icon, color, title, text }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-gray-100 text-center">
                <Icon className="w-8 h-8 mx-auto mb-3" style={{ color }} />
                <h3 className="font-bold text-[#6B0F4B] mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SEÇÃO 6 — CTA final */}
        <div
          className="rounded-2xl p-10 text-center text-white"
          style={{ backgroundColor: "#6B0F4B" }}
        >
          <h2 className="text-2xl font-bold mb-2">Pronta para dar o próximo passo?</h2>
          <p className="text-white/70 mb-6">Sua advogada está a uma mensagem de distância.</p>
          <button
            onClick={handleWhatsApp}
            disabled={!temAdvogado}
            className="inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-lg transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#FFFFFF", color: "#6B0F4B" }}
          >
            <MessageCircle className="w-5 h-5" />
            Iniciar conversa no WhatsApp
          </button>
          <p className="text-xs text-white/50 mt-4 max-w-md mx-auto">
            Ao entrar em contato, um resumo do seu perfil jurídico será enviado automaticamente para
            sua advogada.
          </p>
        </div>
      </div>
    </div>
  );
}
