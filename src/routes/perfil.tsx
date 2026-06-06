import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Users,
  Heart,
  Home,
  DollarSign,
  Briefcase,
  BookOpen,
  Award,
  Download,
  Scale,
  Venus,
  MessageCircle,
  
  RotateCcw,
} from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AreaStatusBadge, statusBorderColor } from "@/components/perfil/AreaStatusBadge";
import { NivelBadge, nivelColor } from "@/components/perfil/NivelBadge";
import { UpsellModal } from "@/components/UpsellModal";

export const Route = createFileRoute("/perfil")({
  component: () => (
    <PrivateRoute>
      <PerfilPage />
    </PrivateRoute>
  ),
});

type AreaKey =
  | "familia"
  | "relacionamento"
  | "patrimonio"
  | "financeiro"
  | "empresa"
  | "heranca"
  | "trabalhista";

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
  acao_imediata?: string;
}

interface Insight {
  area?: string;
  titulo: string;
  descricao: string;
  lei_referencia?: string;
}

interface NextStep {
  ordem: number;
  area?: string;
  titulo: string;
  descricao: string;
  prazo: "imediato" | "curto_prazo" | "medio_prazo";
}

interface ProfileData {
  areas: Partial<Record<AreaKey, AreaInfo>>;
  insights: Insight[];
  attention_points: AttentionPoint[];
  next_steps: NextStep[];
  radar_scores: Partial<Record<AreaKey, number>>;
  extra_data: {
    resumo_geral?: string;
    nivel_vulnerabilidade?: "baixo" | "medio" | "alto";
    frase_de_forca?: string;
  };
  generated_at: string;
}

const TRADUCAO_AREAS: Record<AreaKey, string> = {
  familia: "Família",
  relacionamento: "Relacionamento",
  patrimonio: "Patrimônio",
  financeiro: "Financeiro",
  empresa: "Empresa",
  heranca: "Herança",
  trabalhista: "Trabalhista",
};

const ICONES_AREAS: Record<AreaKey, typeof Users> = {
  familia: Users,
  relacionamento: Heart,
  patrimonio: Home,
  financeiro: DollarSign,
  empresa: Briefcase,
  heranca: BookOpen,
  trabalhista: Award,
};

const NIVEL_VULN = {
  baixo: { color: "#16A34A", bg: "#DCFCE7", label: "Vulnerabilidade Baixa" },
  medio: { color: "#D97706", bg: "#FEF9C3", label: "Vulnerabilidade Média" },
  alto: { color: "#DC2626", bg: "#FEE2E2", label: "Vulnerabilidade Alta" },
};

const PRAZO = {
  imediato: { bg: "#FEE2E2", color: "#DC2626", label: "Faça agora" },
  curto_prazo: { bg: "#FEF9C3", color: "#D97706", label: "Próximas semanas" },
  medio_prazo: { bg: "#DBEAFE", color: "#2563EB", label: "Próximos meses" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function onlyDigits(s: string) {
  return (s || "").replace(/\D+/g, "");
}

function firstName(full: string) {
  return (full || "").trim().split(/\s+/)[0] ?? "";
}

function PerfilPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [nomeUsuaria, setNomeUsuaria] = useState<string>("");
  const [whatsappAdm, setWhatsappAdm] = useState<string>("5511999999999");
  const [geracoesUsed, setGeracoesUsed] = useState(0);
  const [geracoesLimit, setGeracoesLimit] = useState(2);
  const [upsellPerfil, setUpsellPerfil] = useState(false);
  const geracoesRestantes = Math.max(0, geracoesLimit - geracoesUsed);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: pd } = await supabase
        .from("profile_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Nome da usuária (query dedicada e explícita)
      const { data: perfilUsuaria, error: erroNome } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      console.log("Nome buscado:", perfilUsuaria?.full_name, "Erro:", erroNome);
      if (perfilUsuaria?.full_name) {
        setNomeUsuaria(perfilUsuaria.full_name);
      } else {
        setNomeUsuaria(user.email?.split("@")[0] || "cliente");
      }

      // Limites de gerações de perfil
      const { data: limitesPerfil } = await supabase
        .from("profiles")
        .select("perfil_generations_used, perfil_generations_limit")
        .eq("id", user.id)
        .single();
      if (limitesPerfil) {
        setGeracoesUsed(limitesPerfil.perfil_generations_used ?? 0);
        setGeracoesLimit(limitesPerfil.perfil_generations_limit ?? 2);
      }


      // WhatsApp do advogado vinculado (usa RPC segura — RLS bloqueia leitura direta)
      const { data: adv } = await supabase.rpc("get_my_advogado_contact");
      if (Array.isArray(adv) && adv.length > 0) {
        const whats = onlyDigits((adv[0] as { whatsapp: string | null }).whatsapp ?? "");
        if (whats) setWhatsappAdm(whats);
        console.log("WhatsApp do adm:", whats || "(usando padrão)");
      }
      if (pd) {
        setData({
          areas: (pd.areas as unknown as ProfileData["areas"]) ?? {},
          insights: (pd.insights as unknown as Insight[]) ?? [],
          attention_points: (pd.attention_points as unknown as AttentionPoint[]) ?? [],
          next_steps: (pd.next_steps as unknown as NextStep[]) ?? [],
          radar_scores: (pd.radar_scores as unknown as ProfileData["radar_scores"]) ?? {},
          extra_data: (pd.extra_data as unknown as ProfileData["extra_data"]) ?? {},
          generated_at: pd.generated_at,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const refazer = async () => {
    if (!user) return;
    if (geracoesRestantes <= 0) {
      setUpsellPerfil(true);
      return;
    }
    const confirmado = window.confirm("Tem certeza? Seu perfil atual será substituído.");
    if (!confirmado) return;
    await supabase.from("profile_data").delete().eq("user_id", user.id);
    await supabase.from("onboarding_responses").delete().eq("user_id", user.id).eq("step", "consulta");
    localStorage.removeItem("jamais_onboarding_context");
    navigate({ to: "/onboarding" });
  };


  if (loading) return <PerfilSkeleton />;

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <Scale className="w-16 h-16 text-[#A8006E] mb-4" />
        <h1 className="text-2xl font-semibold text-[#6B0F4B] mb-2">
          Seu perfil ainda não foi gerado
        </h1>
        <p className="text-gray-600 mb-6 max-w-md">
          Complete a consulta jurídica para receber seu perfil personalizado.
        </p>
        <Button
          onClick={() => navigate({ to: "/consulta" })}
          className="bg-[#A8006E] hover:bg-[#8B005A] text-white"
        >
          Iniciar consulta
        </Button>
      </div>
    );
  }

  const nivel = data.extra_data?.nivel_vulnerabilidade ?? "medio";
  const nivelCfg = NIVEL_VULN[nivel];

  const radarData = Object.entries(data.radar_scores).map(([area, score]) => ({
    area: TRADUCAO_AREAS[area as AreaKey] ?? area,
    score: Number(score) || 0,
  }));

  const areasList = (Object.entries(data.areas) as [AreaKey, AreaInfo][])
    .filter(([, info]) => info && info.status !== "nao_aplicavel");

  const orderNivel = { alto: 0, medio: 1, baixo: 2 } as const;
  const pontosOrdenados = [...data.attention_points].sort(
    (a, b) => (orderNivel[a.nivel] ?? 99) - (orderNivel[b.nivel] ?? 99),
  );
  const passosOrdenados = [...data.next_steps].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const tituloPerfil = `Perfil Jurídico de ${nomeUsuaria || "você"}`;

  return (
    <div className="min-h-screen bg-white perfil-print-root">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: #ffffff !important; }
          aside, nav, header, .no-print { display: none !important; }
          main { flex: 1 1 100% !important; }
          .perfil-print-root section { page-break-inside: avoid; padding: 16px 0 !important; max-width: 100% !important; }
          .perfil-print-root h1, .perfil-print-root h2, .perfil-print-root h3 { color: #6B0F4B !important; }
          .perfil-print-root .print-hero {
            background: #6B0F4B !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: #ffffff !important;
            border-radius: 8px;
            padding: 20px !important;
            margin-bottom: 16px;
          }
          .perfil-print-root .print-hero * { color: #ffffff !important; }
          .perfil-print-root .grid { display: grid !important; }
          .perfil-print-root [data-print-card] {
            border: 1px solid #E5E7EB !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          .perfil-print-root .recharts-wrapper { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* SEÇÃO 1 — Hero */}
      <section
        className="px-6 md:px-12 py-12 text-white text-center print-hero"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <Venus className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {tituloPerfil}
        </h1>
        <p className="text-white/80 text-sm mb-4">
          Gerado em {formatDate(data.generated_at)}
        </p>
        <div
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold mb-2"
          style={{ backgroundColor: nivelCfg.bg, color: nivelCfg.color }}
        >
          {nivelCfg.label}
        </div>
        {data.extra_data?.frase_de_forca && (
          <p className="text-lg md:text-xl italic max-w-2xl mx-auto mt-6 leading-relaxed">
            "{data.extra_data.frase_de_forca}"
          </p>
        )}
      </section>

      {/* SEÇÃO 2 — Radar */}
      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">Panorama Jurídico</h2>
        <p className="text-gray-600 mb-6">Visão geral das suas áreas de direito</p>
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-100">
          <div className="w-full" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={120}>
                <PolarGrid gridType="polygon" />
                <PolarAngleAxis
                  dataKey="area"
                  tick={{ fontSize: 12, fill: "#6B0F4B" }}
                />
                <Radar
                  dataKey="score"
                  fill="#A8006E"
                  fillOpacity={0.3}
                  stroke="#A8006E"
                  strokeWidth={2}
                />
                <Tooltip formatter={(value: number) => [`${value}/100`, "Pontuação"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Escala de 0 a 100, onde 100 = sem vulnerabilidade
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 text-sm">
            <div className="flex items-center gap-2"><span>🟢</span> 70-100: Situação tranquila</div>
            <div className="flex items-center gap-2"><span>🟡</span> 40-69: Requer atenção</div>
            <div className="flex items-center gap-2"><span>🔴</span> 0-39: Situação crítica</div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 3 — Cards de áreas */}
      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-[#6B0F4B] mb-6">Suas Áreas Jurídicas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {areasList.map(([key, info]) => {
            const Icon = ICONES_AREAS[key];
            return (
              <div
                key={key}
                className="bg-white rounded-lg p-5 shadow-sm border border-gray-100"
                style={{ borderLeft: `4px solid ${statusBorderColor(info.status)}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-[#A8006E]" />
                    <h3 className="font-semibold text-[#6B0F4B]">{TRADUCAO_AREAS[key]}</h3>
                  </div>
                  <AreaStatusBadge status={info.status} />
                </div>
                {info.resumo && <p className="text-sm text-gray-600 leading-relaxed">{info.resumo}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* SEÇÃO 4 — Pontos de atenção */}
      {pontosOrdenados.length > 0 && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">⚠️ Pontos de Atenção</h2>
          <p className="text-gray-600 mb-6">Situações que merecem cuidado imediato</p>
          <div className="space-y-4">
            {pontosOrdenados.map((p, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-5 shadow-sm border border-gray-100"
                style={{ borderLeft: `4px solid ${nivelColor(p.nivel)}` }}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    {p.area && (
                      <p className="text-xs uppercase text-gray-400 tracking-wider mb-1">{p.area}</p>
                    )}
                    <h3 className="font-bold text-[#6B0F4B]">{p.titulo}</h3>
                  </div>
                  <NivelBadge nivel={p.nivel} />
                </div>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{p.descricao}</p>
                {p.acao_imediata && (
                  <div className="bg-gray-50 rounded-md p-3 text-sm">
                    <span className="font-semibold text-[#6B0F4B]">💡 Ação recomendada: </span>
                    <span className="text-gray-700">{p.acao_imediata}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 5 — Insights */}
      {data.insights.length > 0 && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">💡 Insights Jurídicos</h2>
          <p className="text-gray-600 mb-6">O que a lei diz sobre a sua situação</p>
          <Accordion
            type="multiple"
            className="space-y-2"
            defaultValue={data.insights.map((_, i) => `ins-${i}`)}
          >
            {data.insights.map((ins, i) => (
              <AccordionItem
                key={i}
                value={`ins-${i}`}
                className="bg-white border border-gray-200 rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    {ins.area && (
                      <span className="text-xs uppercase font-medium px-2 py-0.5 rounded bg-[#FDF6F9] text-[#A8006E]">
                        {ins.area}
                      </span>
                    )}
                    <span className="font-semibold text-[#6B0F4B]">{ins.titulo}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">{ins.descricao}</p>
                  {ins.lei_referencia && (
                    <div
                      className="rounded-md p-3 text-sm"
                      style={{ backgroundColor: "#FDF6F9", borderLeft: "3px solid #A8006E" }}
                    >
                      <span className="font-semibold text-[#6B0F4B]">⚖️ Base legal: </span>
                      <span className="text-gray-700">{ins.lei_referencia}</span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* SEÇÃO 6 — Próximos passos */}
      {passosOrdenados.length > 0 && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">🗺️ Seus Próximos Passos</h2>
          <p className="text-gray-600 mb-6">Um plano de ação personalizado para você</p>
          <div className="relative space-y-4">
            {passosOrdenados.map((step, i) => {
              const prazoCfg = PRAZO[step.prazo] ?? PRAZO.curto_prazo;
              const isLast = i === passosOrdenados.length - 1;
              return (
                <div key={i} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#A8006E] text-white flex items-center justify-center font-bold shrink-0 z-10">
                      {step.ordem ?? i + 1}
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-[#A8006E]/20 my-1" />}
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-5 shadow-sm border border-gray-100 mb-2">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: prazoCfg.bg, color: prazoCfg.color }}
                      >
                        {prazoCfg.label}
                      </span>
                      {step.area && (
                        <span className="text-xs uppercase font-medium px-2 py-0.5 rounded bg-[#FDF6F9] text-[#A8006E]">
                          {step.area}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 accent-[#A8006E]"
                        aria-label="Marcar como feito"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-[#6B0F4B] mb-1">{step.titulo}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{step.descricao}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO 7 — Resumo geral */}
      {data.extra_data?.resumo_geral && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
          <div
            className="rounded-xl p-8 border"
            style={{
              background: "linear-gradient(135deg, #FDF6F9 0%, #FFFFFF 100%)",
              borderColor: "#E8D0E0",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Venus className="w-7 h-7 text-[#A8006E]" />
              <h2 className="text-xl font-bold text-[#6B0F4B]">
                Análise Completa do seu Perfil
              </h2>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {data.extra_data.resumo_geral}
            </p>
            <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-[#E8D0E0]">
              Este perfil foi gerado com base nas leis brasileiras vigentes e nas informações
              fornecidas por você. Não substitui consulta com advogada.
            </p>
          </div>
        </section>
      )}

      {/* SEÇÃO 8 — Ações */}
      <section
        className="px-6 md:px-12 py-12 text-center no-print"
        style={{ backgroundColor: "#FDF6F9" }}
      >
        <h2 className="text-xl font-bold text-[#6B0F4B] mb-2">E agora?</h2>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto text-sm">
          Salve seu perfil, tire dúvidas com a Sofia ou fale diretamente com sua assessora.
        </p>
        <div className="flex flex-col md:flex-row gap-3 justify-center max-w-3xl mx-auto">
          <Button
            onClick={() => window.print()}
            className="bg-[#A8006E] hover:bg-[#8B005A] text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar resultado em PDF
          </Button>
          <Button
            onClick={() => navigate({ to: "/pesquisa" })}
            variant="outline"
            className="border-[#A8006E] text-[#A8006E] hover:bg-[#A8006E] hover:text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Tirar uma dúvida
          </Button>
          {(() => {
            const nomeExibido = firstName(nomeUsuaria) || "uma cliente";
            const mensagem = encodeURIComponent(
              `Olá! Sou ${nomeExibido}, cliente da plataforma Jamais Enganada. ` +
                `Recebi meu perfil jurídico e gostaria de conversar sobre minha situação.`,
            );
            const href = `https://wa.me/${whatsappAdm}?text=${mensagem}`;
            return (
              <Button
                onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
                className="text-white"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar no WhatsApp
              </Button>
            );
          })()}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            className="text-[#6B0F4B] hover:bg-white"
            onClick={refazer}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refazer consulta
          </Button>
          <p className={`text-xs ${geracoesRestantes > 0 ? "text-gray-500" : "text-[#A8002B]"}`}>
            {geracoesRestantes > 0
              ? `${geracoesRestantes} geração${geracoesRestantes !== 1 ? "ões" : ""} restante${geracoesRestantes !== 1 ? "s" : ""}`
              : "Nenhuma geração restante"}
          </p>
        </div>
      </section>

      <UpsellModal
        open={upsellPerfil}
        onClose={() => setUpsellPerfil(false)}
        tipo="perfil"
        onConfirm={() => {
          setUpsellPerfil(false);
          toast("Em breve: pagamento integrado! 💜");
        }}
      />
    </div>
  );
}



function PerfilSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="animate-pulse bg-gray-200 h-64 w-full" />
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="animate-pulse bg-gray-200 h-96 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg" />
          ))}
        </div>
        <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />
        <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />
      </div>
    </div>
  );
}
