import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
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
import { WhatsAppConsultaModal } from "@/components/WhatsAppConsultaModal";

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
  direito_correspondente?: string;
  dado_faltante?: boolean;
}

interface AttentionPoint {
  area?: string;
  titulo: string;
  descricao: string;
  nivel: "alto" | "medio" | "baixo";
  acao_imediata?: string;
  direito_que_protege?: string;
}

interface Insight {
  area?: string;
  titulo: string;
  descricao: string;
  lei_referencia?: string;
  direito_aplicavel?: string;
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
    perguntas_sugeridas?: Record<string, string[]>;
    dados_faltantes?: string[];
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

interface HistoryEntry {
  id: string;
  generated_at: string;
  archived_at: string;
  data: ProfileData;
}

function PerfilPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingHistory, setViewingHistory] = useState<HistoryEntry | null>(null);
  const [nomeUsuaria, setNomeUsuaria] = useState<string>("");
  const [whatsappAdm, setWhatsappAdm] = useState<string>("5511999999999");
  const [geracoesUsed, setGeracoesUsed] = useState(0);
  const [geracoesLimit, setGeracoesLimit] = useState(2);
  const [upsellPerfil, setUpsellPerfil] = useState(false);
  const [whatsappConfirmOpen, setWhatsappConfirmOpen] = useState(false);
  const [pendingWhatsappHref, setPendingWhatsappHref] = useState<string | null>(null);
  const geracoesRestantes = Math.max(0, geracoesLimit - geracoesUsed);

  const loadHistory = async (uid: string) => {
    const { data: hist } = await supabase
      .from("profile_history")
      .select("*")
      .eq("user_id", uid)
      .order("archived_at", { ascending: false });
    setHistory(
      ((hist as unknown as Array<Record<string, unknown>>) ?? []).map((h) => ({
        id: h.id as string,
        generated_at: h.generated_at as string,
        archived_at: h.archived_at as string,
        data: {
          areas: (h.areas as ProfileData["areas"]) ?? {},
          insights: (h.insights as Insight[]) ?? [],
          attention_points: (h.attention_points as AttentionPoint[]) ?? [],
          next_steps: (h.next_steps as NextStep[]) ?? [],
          radar_scores: (h.radar_scores as ProfileData["radar_scores"]) ?? {},
          extra_data: (h.extra_data as ProfileData["extra_data"]) ?? {},
          generated_at: h.generated_at as string,
        },
      })),
    );
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: pd } = await supabase
        .from("profile_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: perfilUsuaria } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (perfilUsuaria?.full_name) setNomeUsuaria(perfilUsuaria.full_name);
      else setNomeUsuaria(user.email?.split("@")[0] || "cliente");

      const { data: limitesPerfil } = await supabase
        .from("profiles")
        .select("perfil_generations_used, perfil_generations_limit")
        .eq("id", user.id)
        .single();
      if (limitesPerfil) {
        setGeracoesUsed(limitesPerfil.perfil_generations_used ?? 0);
        setGeracoesLimit(limitesPerfil.perfil_generations_limit ?? 2);
      }

      const { data: adv } = await supabase.rpc("get_my_advogado_contact");
      if (adv && typeof adv === "object") {
        const whats = onlyDigits((adv as { whatsapp?: string | null }).whatsapp ?? "");
        if (whats) setWhatsappAdm(whats);
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
      await loadHistory(user.id);
      setLoading(false);
    })();
  }, [user]);

  const refazer = async () => {
    if (!user) return;
    if (geracoesRestantes <= 0) {
      setUpsellPerfil(true);
      return;
    }
    const confirmado = window.confirm(
      "Tem certeza? Seu perfil atual será arquivado no histórico e um novo será gerado.",
    );
    if (!confirmado) return;

    if (data) {
      const { error: histErr } = await supabase.from("profile_history").insert({
        user_id: user.id,
        areas: data.areas as never,
        insights: data.insights as never,
        attention_points: data.attention_points as never,
        next_steps: data.next_steps as never,
        radar_scores: data.radar_scores as never,
        extra_data: data.extra_data as never,
        generated_at: data.generated_at,
      });
      if (histErr) {
        console.error("Erro ao arquivar perfil no histórico:", histErr);
        toast.error("Não foi possível arquivar seu perfil atual. Tente novamente.");
        return;
      }
    }

    await supabase.from("profile_data").delete().eq("user_id", user.id);
    await supabase.from("onboarding_responses").delete().eq("user_id", user.id).eq("step", "consulta");
    localStorage.removeItem("jamais_onboarding_context");
    navigate({ to: "/onboarding" });
  };



  if (loading) return <PerfilSkeleton />;

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <Scale className="w-16 h-16 text-[#552736] mb-4" />
        <h1 className="text-2xl font-semibold text-[#6B0F4B] mb-2">
          Seu perfil ainda não foi gerado
        </h1>
        <p className="text-gray-600 mb-6 max-w-md">
          Complete a consulta jurídica para receber seu perfil personalizado.
        </p>
        <Button
          onClick={() => navigate({ to: "/consulta" })}
          className="bg-[#552736] hover:bg-[#3F1C28] text-white"
        >
          Iniciar consulta
        </Button>
      </div>
    );
  }

  const displayData = viewingHistory?.data ?? data;
  const isViewingArchive = !!viewingHistory;
  const nivel = displayData.extra_data?.nivel_vulnerabilidade ?? "medio";
  const nivelCfg = NIVEL_VULN[nivel];

  const radarData = Object.entries(displayData.radar_scores).map(([area, score]) => ({
    area: TRADUCAO_AREAS[area as AreaKey] ?? area,
    score: Number(score) || 0,
  }));

  const areasList = (Object.entries(displayData.areas) as [AreaKey, AreaInfo][])
    .filter(([, info]) => info && info.status !== "nao_aplicavel");

  const orderNivel = { alto: 0, medio: 1, baixo: 2 } as const;
  const pontosOrdenados = [...displayData.attention_points].sort(
    (a, b) => (orderNivel[a.nivel] ?? 99) - (orderNivel[b.nivel] ?? 99),
  );
  const passosOrdenados = [...displayData.next_steps].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const areasFaltantes = new Set(
    (Object.entries(displayData.areas) as [AreaKey, AreaInfo][])
      .filter(([, info]) => info?.dado_faltante)
      .map(([k]) => k as string),
  );

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

      {isViewingArchive && (
        <div className="sticky top-0 z-30 bg-[#6B0F4B] text-white px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3 no-print">
          <span>
            📂 Você está vendo um perfil arquivado em{" "}
            <strong>{formatDate(viewingHistory!.archived_at)}</strong>
          </span>
          <button
            onClick={() => setViewingHistory(null)}
            className="bg-white text-[#6B0F4B] font-semibold px-3 py-1 rounded-md text-xs hover:bg-white/90"
          >
            Voltar ao perfil atual
          </button>
        </div>
      )}

      {/* SEÇÃO 1 — Hero */}
      <section
        className="px-6 md:px-12 py-12 text-white text-center print-hero"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #552736 100%)" }}
      >
        <Venus className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {tituloPerfil}
        </h1>
        <p className="text-white/80 text-sm mb-4">
          Gerado em {formatDate(displayData.generated_at)}
        </p>
        <div
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold mb-2"
          style={{ backgroundColor: nivelCfg.bg, color: nivelCfg.color }}
        >
          {nivelCfg.label}
        </div>
        {displayData.extra_data?.frase_de_forca && (
          <p className="text-lg md:text-xl italic max-w-2xl mx-auto mt-6 leading-relaxed">
            "{displayData.extra_data.frase_de_forca}"
          </p>
        )}
      </section>

      {/* SEÇÃO 2 — Radar com zonas de cor */}
      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">Panorama Jurídico</h2>
        <p className="text-gray-600 mb-6">Visão geral das suas áreas de direito</p>
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-100">
          <div className="w-full" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={130}>
                <PolarGrid gridType="polygon" stroke="#E5E7EB" />
                {/* Zona OK 70-100 (verde claro) — fundo mais externo */}
                <Radar
                  name="zona-ok"
                  dataKey={() => 100}
                  fill="#DCFCE7"
                  fillOpacity={0.35}
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                />
                {/* Zona Atenção 40-69 (amarela) */}
                <Radar
                  name="zona-atencao"
                  dataKey={() => 69}
                  fill="#FEF9C3"
                  fillOpacity={0.45}
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                />
                {/* Zona Crítica 0-39 (vermelha) — fundo mais interno */}
                <Radar
                  name="zona-critica"
                  dataKey={() => 39}
                  fill="#FEE2E2"
                  fillOpacity={0.55}
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                />
                <PolarAngleAxis
                  dataKey="area"
                  tick={(props: { x: number; y: number; payload: { value: string } }) => {
                    const item = radarData.find((d) => d.area === props.payload.value);
                    const score = item?.score ?? 0;
                    const color = score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";
                    const icon = score >= 70 ? "✓" : score >= 40 ? "⚠" : "⚡";
                    return (
                      <text
                        x={props.x}
                        y={props.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={color}
                        fontSize={12}
                        fontWeight={600}
                      >
                        {icon} {props.payload.value}
                      </text>
                    );
                  }}
                />
                {/* Dados reais da usuária */}
                <Radar
                  name="score"
                  dataKey="score"
                  fill="#A8006E"
                  fillOpacity={0.6}
                  stroke="#6B0F4B"
                  strokeWidth={2}
                  dot={{ fill: "#6B0F4B", strokeWidth: 2, r: 5 }}
                />
                <Tooltip
                  content={(props) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { active, payload } = props as any;
                    if (!active || !payload?.length) return null;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const real = (payload as any[]).find((p) => typeof p.value === "number" && p.payload?.area);
                    if (!real) return null;
                    const score = Number(real.value);
                    const status =
                      score >= 70 ? "✓ Tranquila" : score >= 40 ? "⚠ Atenção" : "⚡ Crítica";
                    const color =
                      score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                        <p className="font-bold text-sm" style={{ color }}>
                          {real.payload.area}: {score}/100
                        </p>
                        <p className="text-xs text-gray-500">{status}</p>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#DCFCE7] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="text-xs text-[#16A34A] font-medium">70-100 Tranquila</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#FEF9C3] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span className="text-xs text-[#D97706] font-medium">40-69 Atenção</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#FEE2E2] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span className="text-xs text-[#DC2626] font-medium">0-39 Crítica</span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2b — Gráfico de barras: nível de exposição */}
      <section className="px-6 md:px-12 pb-4 max-w-5xl mx-auto">
        <div
          className="bg-white border border-gray-100"
          style={{ borderRadius: 12, padding: 32, boxShadow: "0 4px 12px rgba(85,39,54,0.06)" }}
        >
          <h2 className="text-xl font-bold text-[#6B0F4B] mb-1">📊 Nível de Exposição por Área</h2>
          <p className="text-gray-600 text-sm mb-6">
            Quanto menor a pontuação, maior a atenção necessária
          </p>
          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={radarData.map((item) => ({
                  area: item.area,
                  score: item.score,
                  fill:
                    item.score >= 70 ? "#16A34A" : item.score >= 40 ? "#D97706" : "#DC2626",
                }))}
                margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3E8F0" />
                <XAxis
                  dataKey="area"
                  tick={{ fontSize: 11, fill: "#6B0F4B" }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                />
                <Tooltip
                  content={(props) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { active, payload } = props as any;
                    if (!active || !payload?.length) return null;
                    const score = Number(payload[0].value);
                    const status =
                      score >= 70 ? "✓ Tranquila" : score >= 40 ? "⚠ Atenção" : "⚡ Crítica";
                    const color =
                      score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                        <p className="font-bold text-sm" style={{ color }}>
                          {payload[0].payload.area}: {score}/100
                        </p>
                        <p className="text-xs text-gray-500">{status}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#16A34A"
                  strokeDasharray="4 4"
                  label={{ value: "Tranquila", fill: "#16A34A", fontSize: 10, position: "right" }}
                />
                <ReferenceLine
                  y={40}
                  stroke="#D97706"
                  strokeDasharray="4 4"
                  label={{ value: "Atenção", fill: "#D97706", fontSize: 10, position: "right" }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {radarData.map((item, index) => (
                    <Cell
                      key={index}
                      fill={
                        item.score >= 70
                          ? "#16A34A"
                          : item.score >= 40
                            ? "#D97706"
                            : "#DC2626"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                    <Icon className="w-6 h-6 text-[#552736]" />
                    <h3 className="font-semibold text-[#6B0F4B]">{TRADUCAO_AREAS[key]}</h3>
                  </div>
                  <AreaStatusBadge status={info.status} />
                </div>
                {info.dado_faltante && (
                  <div className="mb-2 text-xs text-[#D97706] flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Informação não fornecida — veja o que descobrir abaixo</span>
                  </div>
                )}
                {info.resumo && <p className="text-sm text-gray-600 leading-relaxed">{info.resumo}</p>}
                {info.direito_correspondente && (
                  <div
                    className="mt-3 p-3 rounded-r-lg"
                    style={{
                      background: "#F0FDF4",
                      borderLeft: "3px solid #16A34A",
                    }}
                  >
                    <p className="text-xs font-semibold text-[#16A34A] mb-1">
                      ⚖️ Seu direito nesta situação:
                    </p>
                    <p className="text-xs text-[#15803D] leading-relaxed">
                      {info.direito_correspondente}
                    </p>
                  </div>
                )}
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
                {p.direito_que_protege && (
                  <div
                    className="mb-2 p-3 rounded-r-md"
                    style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A" }}
                  >
                    <p className="text-xs font-semibold text-[#16A34A] mb-1">
                      ⚖️ O direito que te protege:
                    </p>
                    <p className="text-xs text-[#15803D] leading-relaxed">
                      {p.direito_que_protege}
                    </p>
                  </div>
                )}
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

      {/* SEÇÃO 4b — Perguntas sugeridas para a advogada */}
      {(() => {
        const perguntas = displayData.extra_data?.perguntas_sugeridas ?? {};
        const STATUS_ORDER = { critico: 0, atencao: 1, ok: 2, nao_aplicavel: 3 } as const;
        const entradas = Object.entries(perguntas)
          .filter(([, qs]) => Array.isArray(qs) && qs.length > 0)
          .map(([areaKey, qs]) => {
            const info = displayData.areas[areaKey as AreaKey];
            return {
              areaKey,
              status: info?.status ?? "atencao",
              perguntas: (qs as string[]).slice(0, 3),
            };
          })
          .sort(
            (a, b) =>
              (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 9) -
              (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 9),
          )
          .slice(0, 3);

        if (entradas.length === 0) return null;

        return (
          <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">
              💬 Perguntas para aprofundar com sua advogada
            </h2>
            <p className="text-gray-600 mb-6">
              Com base no seu perfil, estas são as perguntas certas para fazer no tira-dúvidas
              ou com sua advogada:
            </p>
            <div className="space-y-4">
              {entradas.map(({ areaKey, status, perguntas: qs }) => (
                <div
                  key={areaKey}
                  className="bg-white rounded-lg p-5 shadow-sm border border-gray-100"
                  style={{ borderLeft: `4px solid ${statusBorderColor(status as AreaStatus)}` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-[#6B0F4B]">
                      {TRADUCAO_AREAS[areaKey as AreaKey] ?? areaKey}
                    </h3>
                    <AreaStatusBadge status={status as AreaStatus} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {qs.map((pergunta, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem("jamais_pergunta_sugerida", pergunta);
                          } catch {
                            /* ignore */
                          }
                          navigate({ to: "/pesquisa" });
                        }}
                        className="text-left text-sm px-3 py-2 rounded-lg border transition-all hover:bg-[#FDF6F9]"
                        style={{
                          borderColor: "#E8D0E0",
                          background: "#FFFFFF",
                          color: "#552736",
                        }}
                      >
                        💬 {pergunta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}


      {/* SEÇÃO 5 — Insights */}
      {displayData.insights.length > 0 && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">💡 Insights Jurídicos</h2>
          <p className="text-gray-600 mb-6">O que a lei diz sobre a sua situação</p>
          <Accordion
            type="multiple"
            className="space-y-2"
            defaultValue={displayData.insights.map((_, i) => `ins-${i}`)}
          >
            {displayData.insights.map((ins, i) => (
              <AccordionItem
                key={i}
                value={`ins-${i}`}
                className="bg-white border border-gray-200 rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    {ins.area && (
                      <span className="text-xs uppercase font-medium px-2 py-0.5 rounded bg-[#FDF6F9] text-[#552736]">
                        {ins.area}
                      </span>
                    )}
                    <span className="font-semibold text-[#6B0F4B]">{ins.titulo}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">{ins.descricao}</p>
                  {ins.direito_aplicavel && (
                    <div
                      className="rounded-md p-3 text-sm mb-2"
                      style={{ backgroundColor: "#F0FDF4", borderLeft: "3px solid #16A34A" }}
                    >
                      <span className="font-semibold text-[#16A34A]">⚖️ O direito que você tem: </span>
                      <span className="text-[#15803D]">{ins.direito_aplicavel}</span>
                    </div>
                  )}
                  {ins.lei_referencia && (
                    <div
                      className="rounded-md p-3 text-sm"
                      style={{ backgroundColor: "#FDF6F9", borderLeft: "3px solid #552736" }}
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
                    <div className="w-10 h-10 rounded-full bg-[#552736] text-white flex items-center justify-center font-bold shrink-0 z-10">
                      {step.ordem ?? i + 1}
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-[#552736]/20 my-1" />}
                  </div>
                  <div
                    className="flex-1 bg-white rounded-lg p-5 shadow-sm border mb-2"
                    style={
                      step.area && areasFaltantes.has(step.area)
                        ? { borderColor: "#FBBF24", borderWidth: 2, background: "#FFFBEB" }
                        : { borderColor: "#F3F4F6" }
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: prazoCfg.bg, color: prazoCfg.color }}
                      >
                        {prazoCfg.label}
                      </span>
                      {step.area && (
                        <span className="text-xs uppercase font-medium px-2 py-0.5 rounded bg-[#FDF6F9] text-[#552736]">
                          {step.area}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 accent-[#552736]"
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
      {displayData.extra_data?.resumo_geral && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
          <div
            className="rounded-xl p-8 border"
            style={{
              background: "linear-gradient(135deg, #FDF6F9 0%, #FFFFFF 100%)",
              borderColor: "#E8D0E0",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Venus className="w-7 h-7 text-[#552736]" />
              <h2 className="text-xl font-bold text-[#6B0F4B]">
                Análise Completa do seu Perfil
              </h2>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {displayData.extra_data.resumo_geral}
            </p>
            <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-[#E8D0E0]">
              Este perfil foi gerado com base nas leis brasileiras vigentes e nas informações
              fornecidas por você. Não substitui consulta com advogada.
            </p>
          </div>
        </section>
      )}

      {/* SEÇÃO — Histórico de perfis */}
      {history.length > 0 && (
        <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto no-print">
          <h2 className="text-2xl font-bold text-[#6B0F4B] mb-1">📚 Histórico de Perfis</h2>
          <p className="text-gray-600 mb-6">
            Seus perfis anteriores ficam salvos aqui — você pode revisitá-los a qualquer momento.
          </p>
          <div className="space-y-3">
            {history.map((h) => {
              const niv = h.data.extra_data?.nivel_vulnerabilidade ?? "medio";
              const nivCfg = NIVEL_VULN[niv];
              const isOpen = viewingHistory?.id === h.id;
              return (
                <div
                  key={h.id}
                  className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs uppercase text-gray-400 tracking-wider mb-1">
                      Arquivado em {formatDate(h.archived_at)}
                    </p>
                    <p className="font-semibold text-[#6B0F4B]">
                      Perfil gerado em {formatDate(h.generated_at)}
                    </p>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-2"
                      style={{ backgroundColor: nivCfg.bg, color: nivCfg.color }}
                    >
                      {nivCfg.label}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      setViewingHistory(isOpen ? null : h);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    variant={isOpen ? "outline" : "default"}
                    className={
                      isOpen
                        ? "border-[#552736] text-[#552736]"
                        : "bg-[#552736] hover:bg-[#3F1C28] text-white"
                    }
                  >
                    {isOpen ? "Voltar ao atual" : "Ver este perfil"}
                  </Button>
                </div>
              );
            })}
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
            className="bg-[#552736] hover:bg-[#3F1C28] text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar resultado em PDF
          </Button>
          <Button
            onClick={() => navigate({ to: "/pesquisa" })}
            variant="outline"
            className="border-[#552736] text-[#552736] hover:bg-[#552736] hover:text-white"
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
                onClick={() => {
                  setPendingWhatsappHref(href);
                  setWhatsappConfirmOpen(true);
                }}
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
        userEmail={user?.email ?? null}
        userId={user?.id ?? null}
        onRecargaConfirmada={() => {
          setUpsellPerfil(false);
          toast("Recarga confirmada! Você já pode gerar um novo perfil. 💜");
        }}
      />
      <WhatsAppConsultaModal
        open={whatsappConfirmOpen}
        onClose={() => setWhatsappConfirmOpen(false)}
        onConfirm={() => {
          if (pendingWhatsappHref) {
            window.open(pendingWhatsappHref, "_blank", "noopener,noreferrer");
          }
          setPendingWhatsappHref(null);
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
