import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateProfile } from "./profile.functions";

type Sender = "sofia" | "user";

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
}

interface OnboardingCtx {
  nome?: string;
  idade?: string;
  estado?: string;
  estado_civil?: string;
  tem_filhos?: string;
  tem_empresa?: string;
  tem_bens?: string;
  motivacao_principal?: string;
  [k: string]: string | undefined;
}

interface Question {
  id: string;
  text: string;
  options?: string[];
}

const LOADING_STEPS = [
  "Analisando seus dados...",
  "Cruzando com a legislação...",
  "Identificando pontos de atenção...",
  "Finalizando seu perfil...",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isAfirmativo(v: string | undefined) {
  if (!v) return false;
  const s = v.toLowerCase();
  return /(sim|tenho|tive|já tive|temos|ltda|mei|me|autônoma|autonoma|empresa|cnpj)/.test(s) && !/^n[aã]o\b/.test(s);
}

function temFilhos(v: string | undefined) {
  if (!v) return false;
  const s = v.toLowerCase();
  if (/^n[aã]o/.test(s.trim())) return false;
  return /sim|tenho|\d/.test(s);
}

function isSolteiraOuDiv(v: string | undefined) {
  if (!v) return false;
  return /(solteira|divorciada|separada|separando)/i.test(v);
}
function isNamorando(v: string | undefined) {
  return !!v && /namor/i.test(v);
}
function isUniaoOuCasada(v: string | undefined) {
  return !!v && /(uni[aã]o|casada|casamento)/i.test(v);
}

function buildQuestions(ctx: OnboardingCtx): Question[] {
  const qs: Question[] = [];

  // Q1 — depende do estado civil
  if (isSolteiraOuDiv(ctx.estado_civil)) {
    qs.push({
      id: "q1",
      text: "Você está passando por algum processo de separação ou tem pendências jurídicas com um ex-parceiro?",
      options: ["Sim, em processo", "Tenho pendências", "Não, está tudo resolvido", "Nunca houve processo"],
    });
  } else if (isNamorando(ctx.estado_civil)) {
    qs.push({
      id: "q1",
      text: "Você e seu parceiro moram juntos ou dividem despesas? Têm algum bem em comum?",
      options: ["Moramos juntos", "Dividimos despesas", "Temos bens em comum", "Não, somos independentes"],
    });
  } else if (isUniaoOuCasada(ctx.estado_civil)) {
    qs.push({
      id: "q1",
      text: "Vocês formalizaram a união? Qual é o regime de bens?",
      options: ["Comunhão parcial", "Comunhão universal", "Separação total", "Não sei o regime", "Não formalizamos"],
    });
  } else {
    qs.push({
      id: "q1",
      text: "Como está sua vida amorosa hoje? Existe algum tipo de pendência com algum ex-parceiro?",
      options: ["Estou sozinha e tranquila", "Tenho pendências", "Estou em relação nova", "Prefiro não falar"],
    });
  }

  // Q2 — só se tem filhos
  if (temFilhos(ctx.tem_filhos)) {
    qs.push({
      id: "q2",
      text: "Me conta mais sobre a guarda e a pensão dos seus filhos. Existe algum acordo formal ou processo em andamento?",
      options: ["Temos acordo formal", "É informal entre nós", "Está na Justiça", "Não há esse processo"],
    });
  }

  // Q3 — violência
  qs.push({
    id: "q3",
    text: "Existe ou já existiu alguma situação de violência — física, psicológica ou financeira — no seu relacionamento atual ou passado?",
    options: ["Não, nunca", "Já existiu, mas passou", "Estou passando por isso"],
  });

  // Bloco 2
  qs.push({
    id: "q4",
    text: "Você tem imóveis? Se sim, estão no seu nome, no nome do parceiro ou são compartilhados?",
    options: ["Não tenho imóveis", "Só no meu nome", "Só no nome dele", "Compartilhado", "Em financiamento"],
  });
  qs.push({
    id: "q5",
    text: "Como está sua situação financeira hoje? Você tem renda própria?",
    options: ["Sim, renda própria e estável", "Renda própria mas irregular", "Dependo financeiramente de alguém", "Estou desempregada"],
  });
  qs.push({
    id: "q6",
    text: "Você tem dívidas — pessoais, de cartão, financiamentos ou dívidas que possam ser do casal?",
    options: ["Não tenho dívidas", "Tenho dívidas pessoais", "Temos dívidas do casal", "Tenho dívidas empresariais"],
  });

  // Bloco 3 — empresa
  if (isAfirmativo(ctx.tem_empresa)) {
    qs.push({
      id: "q7",
      text: "Me conta sobre o seu negócio. Qual é o tipo? (MEI, ME, LTDA...)",
      options: ["MEI", "ME ou EPP", "LTDA ou S/A", "Autônoma sem CNPJ", "Outra"],
    });
    qs.push({
      id: "q8",
      text: "Existe alguma questão societária — sócio, divisão de cotas, contrato social desatualizado — que te preocupa?",
      options: ["Não, está tudo ok", "Tenho sócio e há conflito", "Contrato desatualizado", "Quero encerrar a empresa"],
    });
  }

  // Bloco 4 — herança
  qs.push({
    id: "q9",
    text: "Você sabe se está contemplada em algum testamento ou inventário? Ou tem parentes próximos com bens que um dia serão partilhados?",
    options: ["Não tenho essa preocupação", "Tenho, mas está organizado", "Existe, mas é confuso", "Estou em processo de inventário"],
  });
  qs.push({
    id: "q10",
    text: "Você tem seguro de vida ou previdência privada com beneficiário definido?",
    options: ["Sim, está no meu nome", "Sim, mas não sei os detalhes", "Não tenho", "Não sei se tenho"],
  });

  // Q11 — aberta
  qs.push({
    id: "q11",
    text: "Para fechar, quero que você me conte livremente: existe algo que ainda não perguntei mas que você sente que é importante para o seu perfil? Pode ser qualquer coisa — um medo, uma dúvida, uma situação específica.",
  });

  return qs;
}

export function useConsulta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const callGenerate = useServerFn(generateProfile);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOptions, setCurrentOptions] = useState<string[] | null>(null);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const ctxRef = useRef<OnboardingCtx>({});
  const questionsRef = useRef<Question[]>([]);
  const currentIndexRef = useRef(-1);
  const respostasRef = useRef<{ question: string; answer: string }[]>([]);
  const hasStartedRef = useRef(false);
  const checkedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  const addMessage = useCallback((sender: Sender, text: string) => {
    setMessages((prev) => [...prev, { id: uid(), sender, text, timestamp: new Date() }]);
  }, []);

  const askQuestion = useCallback(
    (index: number) => {
      const q = questionsRef.current[index];
      if (!q) return;
      setIsTyping(true);
      setCurrentOptions(null);
      schedule(() => {
        setIsTyping(false);
        addMessage("sofia", q.text);
        currentIndexRef.current = index;
        const total = questionsRef.current.length;
        setProgress(Math.round((index / total) * 90));
        if (q.options) {
          setCurrentOptions(q.options);
          setInputDisabled(false);
        } else {
          setCurrentOptions(null);
          setInputDisabled(false);
        }
      }, 1100);
    },
    [addMessage, schedule],
  );

  const finalize = useCallback(async () => {
    setInputDisabled(true);
    setCurrentOptions(null);
    setIsGenerating(true);
    setProgress(95);

    try {
      const res = await callGenerate({
        data: {
          onboarding: ctxRef.current as Record<string, string>,
          respostas: respostasRef.current,
        },
      });

      if (res.ok && res.profile && user) {
        const p = res.profile as Record<string, unknown>;
        try {
          await supabase.from("profile_data").upsert(
            {
              user_id: user.id,
              areas: (p.areas ?? {}) as never,
              insights: (p.insights ?? []) as never,
              attention_points: (p.attention_points ?? []) as never,
              next_steps: (p.next_steps ?? []) as never,
              radar_scores: (p.radar_scores ?? {}) as never,
              extra_data: {
                resumo_geral: p.resumo_geral ?? "",
                nivel_vulnerabilidade: p.nivel_vulnerabilidade ?? "medio",
                frase_de_forca: p.frase_de_forca ?? "",
              } as never,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },

          );
        } catch (e) {
          console.error("profile_data upsert failed", e);
        }
      } else {
        console.error("generateProfile não retornou perfil", res);
      }
    } catch (e) {
      console.error("generateProfile call failed", e);
    }

    setProgress(100);
    navigate({ to: "/perfil" });
  }, [callGenerate, navigate, user]);

  const handleReply = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const index = currentIndexRef.current;
      // -1 = aguardando "vamos começar"
      if (index === -1) {
        addMessage("user", trimmed);
        setCurrentOptions(null);
        setInputDisabled(true);
        schedule(() => askQuestion(0), 600);
        return;
      }

      const q = questionsRef.current[index];
      if (!q || inputDisabled) return;

      setInputDisabled(true);
      setCurrentOptions(null);
      addMessage("user", trimmed);
      respostasRef.current.push({ question: q.text, answer: trimmed });

      if (user) {
        try {
          await supabase.from("onboarding_responses").insert({
            user_id: user.id,
            step: "consulta",
            question: q.text,
            answer: trimmed,
          });
        } catch (e) {
          console.error("supabase insert failed", e);
        }
      }

      // Acolhimento extra para violência atual (q3 - 3ª opção)
      if (q.id === "q3" && /passando por isso/i.test(trimmed)) {
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          addMessage(
            "sofia",
            "Sinto muito que você esteja vivendo isso. Você não está sozinha — a Lei Maria da Penha existe para te proteger, e vamos garantir que seu perfil destaque os caminhos seguros para você. 💜",
          );
          schedule(() => proceed(), 1800);
        }, 1000);
        return;
      }

      proceed();

      function proceed() {
        const next = index + 1;
        if (next >= questionsRef.current.length) {
          // Encerramento
          schedule(() => {
            setIsTyping(true);
            schedule(() => {
              setIsTyping(false);
              addMessage(
                "sofia",
                `Obrigada por compartilhar tudo isso comigo, ${ctxRef.current.nome ?? "amiga"}. Agora vou analisar cada resposta com cuidado e preparar o seu perfil jurídico.`,
              );
              schedule(() => {
                setIsTyping(true);
                schedule(() => {
                  setIsTyping(false);
                  addMessage(
                    "sofia",
                    "Isso pode levar alguns segundos... Já já você terá um panorama completo dos seus direitos e dos pontos que merecem atenção. 🔍",
                  );
                  schedule(() => void finalize(), 1500);
                }, 1500);
              }, 2200);
            }, 1100);
          }, 1000);
          return;
        }
        schedule(() => askQuestion(next), 700);
      }
    },
    [addMessage, askQuestion, finalize, inputDisabled, schedule, user],
  );

  // Loading step rotator
  useEffect(() => {
    if (!isGenerating) return;
    const t = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 3000);
    return () => clearInterval(t);
  }, [isGenerating]);

  // Cleanup
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  // Bootstrap
  useEffect(() => {
    if (!user || hasStartedRef.current || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      // Se já tem profile_data → /perfil
      try {
        const { data: pd } = await supabase
          .from("profile_data")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (pd && pd.length > 0) {
          navigate({ to: "/perfil" });
          return;
        }
      } catch (e) {
        console.error("profile_data check failed", e);
      }

      // Recuperar contexto
      let ctx: OnboardingCtx = {};
      try {
        const raw = localStorage.getItem("jamais_onboarding_context");
        if (raw) ctx = JSON.parse(raw);
      } catch (e) {
        console.error("localStorage parse failed", e);
      }

      if (!ctx || Object.keys(ctx).length === 0) {
        try {
          const { data } = await supabase
            .from("onboarding_responses")
            .select("question, answer")
            .eq("user_id", user.id)
            .eq("step", "onboarding");
          if (data) {
            const map: OnboardingCtx = {};
            for (const r of data) {
              const q = (r.question || "").toLowerCase();
              const a = r.answer ?? undefined;
              if (q.includes("nome")) map.nome = a;
              else if (q.includes("anos")) map.idade = a;
              else if (q.includes("estado") && q.includes("mora")) map.estado = a;
              else if (q.includes("relacionamento") || q.includes("civil")) map.estado_civil = a;
              else if (q.includes("filhos")) map.tem_filhos = a;
              else if (q.includes("negócio") || q.includes("empresa") || q.includes("autônoma")) map.tem_empresa = a;
              else if (q.includes("bens")) map.tem_bens = a;
              else if (q.includes("preocup") || q.includes("buscar")) map.motivacao_principal = a;
            }

            ctx = map;
          }
        } catch (e) {
          console.error("onboarding fetch failed", e);
        }
      }

      ctxRef.current = ctx;
      questionsRef.current = buildQuestions(ctx);
      hasStartedRef.current = true;

      const nome = ctx.nome ?? "amiga";

      schedule(
        () =>
          addMessage(
            "sofia",
            `${nome}, agora vamos mais fundo. Vou te fazer perguntas sobre diferentes áreas da sua vida — família, relacionamento, finanças, empresa e muito mais.`,
          ),
        800,
      );
      schedule(
        () =>
          addMessage(
            "sofia",
            "Responde com calma e da forma mais completa que conseguir. Quanto mais você me contar, mais preciso e útil será o seu perfil jurídico. Pode ser?",
          ),
        3000,
      );
      schedule(() => {
        setCurrentOptions(["Sim, pode começar! 💜", "Tô pronta!"]);
        setInputDisabled(false);
        currentIndexRef.current = -1;
      }, 5500);
    })();
  }, [user, navigate, schedule, addMessage]);

  return {
    messages,
    isTyping,
    progress,
    currentOptions,
    inputDisabled,
    isGenerating,
    loadingText: LOADING_STEPS[loadingStep],
    handleReply,
  };
}
