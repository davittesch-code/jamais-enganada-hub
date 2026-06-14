import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Copy, Loader2, MessageCircle, Scale, Check, BookOpen, Lightbulb, AlertTriangle, UserCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PrivateRoute } from "@/components/PrivateRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { consultarSofia } from "@/lib/pesquisa.functions";
import { UpsellModal } from "@/components/UpsellModal";
import { WhatsAppConsultaModal } from "@/components/WhatsAppConsultaModal";


export const Route = createFileRoute("/pesquisa")({
  component: () => (
    <PrivateRoute>
      <PesquisaPage />
    </PrivateRoute>
  ),
});

interface QueryRow {
  id: string;
  question: string;
  answer: string | null;
  area: string | null;
  created_at: string;
}

const SUGESTOES = [
  "Quais são meus direitos no divórcio?",
  "Como funciona a guarda compartilhada?",
  "Tenho direito à pensão alimentícia?",
  "O que é violência patrimonial?",
];

const LOADING_MSGS = [
  "⚖️ Consultando a legislação brasileira...",
  "📋 Cruzando com o seu perfil jurídico...",
  "💡 Preparando sua resposta...",
];

function identificarArea(pergunta: string): string {
  const p = pergunta.toLowerCase();
  if (p.match(/divórcio|divorcio|separação|separacao|casamento|união estável|uniao estavel/)) return "Família";
  if (p.match(/filho|guarda|pensão|pensao|alimento/)) return "Família";
  if (p.match(/herança|heranca|inventário|inventario|testamento/)) return "Herança";
  if (p.match(/empresa|cnpj|sócio|socio|negócio|negocio/)) return "Empresa";
  if (p.match(/salário|salario|demissão|demissao|trabalho|clt/)) return "Trabalhista";
  if (p.match(/imóvel|imovel|apartamento|casa|financiamento/)) return "Patrimônio";
  if (p.match(/violência|violencia|agressão|agressao|ameaça|ameaca|maria da penha/)) return "Relacionamento";
  if (p.match(/dívida|divida|banco|crédito|credito|financeiro/)) return "Financeiro";
  return "Jurídico Geral";
}

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const SECTION_STYLES: Record<
  string,
  { icon: typeof BookOpen; color: string; bg: string; border: string; match: RegExp }
> = {
  resposta: {
    icon: CheckCircle2,
    color: "#0F7B5A",
    bg: "#E8F7F0",
    border: "#0F7B5A",
    match: /^(resposta(?:\s+direta)?)\s*[:\-]?$/i,
  },
  lei: {
    icon: BookOpen,
    color: "#6B0F4B",
    bg: "#FDF6F9",
    border: "#552736",
    match: /^(o\s+que\s+diz\s+a\s+lei)\s*[:\-]?$/i,
  },
  pratica: {
    icon: Lightbulb,
    color: "#A86B00",
    bg: "#FFF8E8",
    border: "#D4A017",
    match: /^(na\s+pr[áa]tica)\s*[:\-]?$/i,
  },
  atencao: {
    icon: AlertTriangle,
    color: "#A8002B",
    bg: "#FDECEF",
    border: "#D40028",
    match: /^(ponto\s+de\s+aten[çc][ãa]o|aten[çc][ãa]o)\s*[:\-]?$/i,
  },
  perfil: {
    icon: UserCheck,
    color: "#6B0F4B",
    bg: "#FDF6F9",
    border: "#552736",
    match: /^(correla[çc][ãa]o\s+com\s+(?:o\s+)?perfil|relevante\s+para\s+(?:o\s+)?(?:seu\s+)?perfil)\s*[:\-]?$/i,
  },
};

function stripInlineBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

function identifySection(rawTitle: string) {
  const clean = rawTitle.replace(/^\d+\.?\s*/, "").replace(/\*\*/g, "").trim();
  for (const key of Object.keys(SECTION_STYLES)) {
    if (SECTION_STYLES[key].match.test(clean)) return SECTION_STYLES[key];
  }
  return null;
}

function RespostaRenderer({ text }: { text: string }) {
  // Split by lines, group into sections whenever we hit a recognized heading
  const lines = text.split(/\r?\n/);
  type Block = { style: typeof SECTION_STYLES[string] | null; title: string | null; body: string[] };
  const blocks: Block[] = [];
  let current: Block = { style: null, title: null, body: [] };

  for (const raw of lines) {
    const line = raw.trimEnd();
    // Heading detection: line starts with optional "1." or "**", contains a known section title
    const headingMatch = line.match(/^\s*(?:\d+\.\s*)?\*\*([^*]+?)\*\*\s*:?\s*(.*)$/);
    let style = null;
    let restAfterHeading: string | null = null;
    let titleText: string | null = null;

    if (headingMatch) {
      const s = identifySection(headingMatch[1]);
      if (s) {
        style = s;
        titleText = headingMatch[1].replace(/\*\*/g, "").trim().replace(/:$/, "");
        restAfterHeading = headingMatch[2] ?? "";
      }
    } else {
      // Also support "1. O que diz a lei:" without bold
      const plainHeading = line.match(/^\s*\d+\.\s*([A-Za-zÀ-ÿ ]+?)\s*:\s*(.*)$/);
      if (plainHeading) {
        const s = identifySection(plainHeading[1]);
        if (s) {
          style = s;
          titleText = plainHeading[1].trim();
          restAfterHeading = plainHeading[2] ?? "";
        }
      }
    }

    if (style) {
      if (current.title !== null || current.body.length > 0) blocks.push(current);
      current = { style, title: titleText, body: restAfterHeading ? [restAfterHeading] : [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.title !== null || current.body.length > 0) blocks.push(current);

  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        const bodyText = stripInlineBold(b.body.join("\n")).trim();
        if (!b.style) {
          if (!bodyText) return null;
          return (
            <p key={i} className="text-sm text-[#1A0010] whitespace-pre-wrap leading-relaxed">
              {bodyText}
            </p>
          );
        }
        const Icon = b.style.icon;
        return (
          <div
            key={i}
            className="rounded-lg border-l-4 p-4"
            style={{ backgroundColor: b.style.bg, borderLeftColor: b.style.border }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 shrink-0" style={{ color: b.style.color }} />
              <h4 className="text-sm font-semibold" style={{ color: b.style.color }}>
                {b.title}
              </h4>
            </div>
            {bodyText && (
              <p className="text-sm text-[#1A0010] whitespace-pre-wrap leading-relaxed">
                {bodyText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}



function PesquisaPage() {
  const { user, profile } = useAuth();
  const consultar = useServerFn(consultarSofia);

  const [pergunta, setPergunta] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [historico, setHistorico] = useState<QueryRow[]>([]);
  const [ativo, setAtivo] = useState<QueryRow | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [whatsappAdm, setWhatsappAdm] = useState("5511999999999");
  const [perfilCtx, setPerfilCtx] = useState<Record<string, string>>({});
  const [areasCriticas, setAreasCriticas] = useState("não identificadas");
  const [queriesUsed, setQueriesUsed] = useState(0);
  const [queriesLimit, setQueriesLimit] = useState(5);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [whatsappConfirmOpen, setWhatsappConfirmOpen] = useState(false);
  const [perguntaSugeridaBanner, setPerguntaSugeridaBanner] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pergunta pré-preenchida vinda do perfil
  useEffect(() => {
    const perguntaSugerida = localStorage.getItem("jamais_pergunta_sugerida");
    if (perguntaSugerida) {
      setPergunta(perguntaSugerida);
      setPerguntaSugeridaBanner(true);
      localStorage.removeItem("jamais_pergunta_sugerida");
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, []);

  const queriesRestantes = Math.max(0, queriesLimit - queriesUsed);


  // Carga inicial
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Histórico
      const { data: rows } = await supabase
        .from("queries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistorico((rows ?? []) as QueryRow[]);

      // Limites de uso
      const { data: limites } = await supabase
        .from("profiles")
        .select("queries_used, queries_limit")
        .eq("id", user.id)
        .single();
      if (limites) {
        setQueriesUsed(limites.queries_used ?? 0);
        setQueriesLimit(limites.queries_limit ?? 5);
      }


      // WhatsApp adm
      const { data: adv } = await supabase.rpc("get_my_advogado_contact");
      if (adv && typeof adv === "object") {
        const whats = onlyDigits((adv as { whatsapp?: string | null }).whatsapp ?? "");
        if (whats) setWhatsappAdm(whats);
      }

      // Contexto do perfil
      let ctx: Record<string, string> = {};
      try {
        const raw = localStorage.getItem("jamais_onboarding_context");
        if (raw) ctx = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      if (!ctx.estado_civil) {
        const { data: respostas } = await supabase
          .from("onboarding_responses")
          .select("question, answer")
          .eq("user_id", user.id)
          .eq("step", "onboarding");
        if (respostas) {
          const map: Record<string, string> = {};
          for (const r of respostas as { question: string; answer: string | null }[]) {
            const k = r.question.toLowerCase();
            if (k.includes("estado civil")) map.estado_civil = r.answer ?? "";
            else if (k.includes("filho")) map.tem_filhos = r.answer ?? "";
            else if (k.includes("empresa")) map.tem_empresa = r.answer ?? "";
            else if (k.includes("bens") || k.includes("patrimônio")) map.tem_bens = r.answer ?? "";
            else if (k.includes("motiv") || k.includes("situação") || k.includes("preocup"))
              map.motivacao_principal = r.answer ?? "";
          }
          ctx = { ...map, ...ctx };
        }
      }
      setPerfilCtx(ctx);

      // Áreas críticas
      const { data: pd } = await supabase
        .from("profile_data")
        .select("areas")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pd?.areas) {
        const areas = pd.areas as Record<string, { status?: string }>;
        const criticas = Object.entries(areas)
          .filter(([, v]) => v?.status === "critico")
          .map(([k]) => k)
          .join(", ");
        if (criticas) setAreasCriticas(criticas);
      }
    })();
  }, [user]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(160, Math.max(80, el.scrollHeight)) + "px";
  }, [pergunta]);

  // Loading message rotator
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 2000);
    return () => clearInterval(id);
  }, [loading]);

  const charCount = pergunta.length;
  const podeEnviar = pergunta.trim().length >= 3 && !loading && charCount <= 500;

  const handleSubmit = async () => {
    if (!user || !podeEnviar) return;
    if (queriesRestantes <= 0) {
      setUpsellOpen(true);
      return;
    }
    const texto = pergunta.trim();
    setLoading(true);
    setLoadingMsgIdx(0);
    setAtivo(null);
    setCopiado(false);

    const result = await consultar({
      data: { pergunta: texto, perfilCtx, areasCriticas },
    });

    if (!result.ok || !result.answer) {
      setLoading(false);
      const msg =
        result.error === "rate_limit"
          ? "Muitas consultas em pouco tempo. Tente novamente em instantes."
          : result.error === "payment_required"
          ? "Limite de créditos atingido. Avise a administradora."
          : "Não consegui processar agora. Tente novamente.";
      alert(msg);
      return;
    }

    const area = identificarArea(texto);
    const { data: inserted } = await supabase
      .from("queries")
      .insert({ user_id: user.id, question: texto, answer: result.answer, area })
      .select("*")
      .single();

    const novo = (inserted as QueryRow) ?? {
      id: crypto.randomUUID(),
      question: texto,
      answer: result.answer,
      area,
      created_at: new Date().toISOString(),
    };

    // Incrementar contador de uso
    const novoUsed = queriesUsed + 1;
    await supabase
      .from("profiles")
      .update({ queries_used: novoUsed })
      .eq("id", user.id);
    setQueriesUsed(novoUsed);

    setHistorico((prev) => [novo, ...prev]);
    setAtivo(novo);
    setPergunta("");
    setLoading(false);
  };


  const handleCopy = async () => {
    if (!ativo?.answer) return;
    try {
      await navigator.clipboard.writeText(ativo.answer);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const executeWhatsApp = () => {
    const nome = profile?.full_name?.split(" ")[0] ?? "cliente";
    const mensagem = encodeURIComponent(
      `Olá! Sou ${nome}, cliente da Jamais Enganada. Fiz uma consulta no Tira-dúvidas e gostaria de conversar.`
    );
    window.open(`https://wa.me/${whatsappAdm}?text=${mensagem}`, "_blank");
  };

  const handleWhatsApp = () => setWhatsappConfirmOpen(true);

  const novaPergunta = () => {
    setAtivo(null);
    setPergunta("");
    setCopiado(false);
    textareaRef.current?.focus();
  };


  return (
    <div className="min-h-screen bg-[#FDF6F9]">
      <WhatsAppConsultaModal
        open={whatsappConfirmOpen}
        onClose={() => setWhatsappConfirmOpen(false)}
        onConfirm={executeWhatsApp}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="grid gap-6 md:grid-cols-[35%_65%]">
          {/* Histórico */}
          <aside className="space-y-3">
            <h2 className="text-sm font-semibold text-[#6B0F4B]">Perguntas anteriores</h2>
            {historico.length === 0 ? (
              <div className="rounded-lg bg-white border border-[#E8D0E0] p-4 text-center">
                <p className="text-sm text-gray-400">
                  Nenhuma pergunta ainda. Faça sua primeira consulta! 💜
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {historico.map((q) => {
                  const isAtivo = ativo?.id === q.id;
                  return (
                    <li key={q.id}>
                      <button
                        onClick={() => {
                          setAtivo(q);
                          setCopiado(false);
                        }}
                        className={`w-full text-left rounded-lg bg-white border border-[#E8D0E0] p-3 transition-colors hover:bg-[#FDF6F9] ${
                          isAtivo ? "border-l-4 border-l-[#552736]" : ""
                        }`}
                      >
                        <p className="text-sm text-[#1A0010] line-clamp-2">{q.question}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400">{formatDate(q.created_at)}</span>
                          {q.area && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FDF6F9] text-[#6B0F4B] border border-[#E8D0E0]">
                              {q.area}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Coluna principal */}
          <section className="space-y-4">
            {/* Campo de pergunta */}
            <div className="rounded-xl bg-white border border-[#E8D0E0] p-4">
              {/* Contador de consultas restantes */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className={`text-xs font-medium ${queriesRestantes > 0 ? "text-[#6B0F4B]" : "text-[#A8002B]"}`}>
                  {queriesRestantes > 0
                    ? `${queriesRestantes} consulta${queriesRestantes !== 1 ? "s" : ""} restante${queriesRestantes !== 1 ? "s" : ""}`
                    : "Nenhuma consulta restante"}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: queriesLimit }).map((_, i) => (
                    <span
                      key={i}
                      className="block h-1.5 w-5 rounded-full"
                      style={{ backgroundColor: i < queriesUsed ? "#E8D0E0" : "#552736" }}
                    />
                  ))}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value.slice(0, 500))}
                placeholder="Digite sua dúvida jurídica aqui..."
                disabled={loading}
                className="w-full min-h-[80px] max-h-[160px] resize-none rounded-md border border-[#E8D0E0] p-3 text-sm focus:outline-none focus:border-[#552736] transition-colors"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">{charCount}/500</span>
                <button
                  onClick={handleSubmit}
                  disabled={!podeEnviar}
                  className="inline-flex items-center gap-2 rounded-md bg-[#552736] text-white px-4 py-2 text-sm font-medium hover:bg-[#8B0058] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Consultar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Loading card */}
            {loading && (
              <div className="rounded-xl bg-[#FDF6F9] border border-[#E8D0E0] p-5 animate-pulse">
                <p className="text-sm text-[#6B0F4B]">{LOADING_MSGS[loadingMsgIdx]}</p>
              </div>
            )}

            {/* Estado inicial (hero) */}
            {!loading && !ativo && (
              <div className="rounded-xl bg-white border border-[#E8D0E0] p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <Search className="w-14 h-14 text-[#552736]" />
                </div>
                <h1 className="text-2xl font-semibold text-[#6B0F4B]">
                  Tire suas dúvidas jurídicas
                </h1>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Faça uma pergunta sobre seus direitos e receba uma resposta baseada na
                  legislação brasileira, correlacionada com o seu perfil.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setPergunta(s);
                        textareaRef.current?.focus();
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-[#FDF6F9] text-[#6B0F4B] border border-[#E8D0E0] hover:bg-[#F5E0EC] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resposta */}
            {!loading && ativo && (
              <div className="rounded-xl bg-white border border-[#E8D0E0] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#E8D0E0] bg-[#FDF6F9]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Scale className="w-4 h-4 text-[#6B0F4B] shrink-0" />
                    <span className="font-semibold text-[#6B0F4B] text-sm">Resposta jurídica</span>
                    {ativo.area && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white text-[#6B0F4B] border border-[#E8D0E0]">
                        {ativo.area}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {formatDateTime(ativo.created_at)}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-md hover:bg-white text-[#6B0F4B]"
                      title="Copiar resposta"
                    >
                      {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm font-medium text-[#1A0010] mb-4">{ativo.question}</p>
                  {ativo.answer && <RespostaRenderer text={ativo.answer} />}
                </div>



                <div className="flex flex-wrap gap-2 px-6 pb-6">
                  <button
                    onClick={novaPergunta}
                    className="inline-flex items-center gap-2 rounded-md border border-[#552736] text-[#552736] px-4 py-2 text-sm font-medium hover:bg-[#FDF6F9] transition-colors"
                  >
                    Fazer outra pergunta
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="inline-flex items-center gap-2 rounded-md text-white px-4 py-2 text-sm font-medium transition-colors"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Falar com assessora
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <UpsellModal
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        tipo="perguntas"
        onConfirm={() => {
          setUpsellOpen(false);
          toast("Em breve: pagamento integrado! 💜");
        }}
      />
    </div>
  );
}
