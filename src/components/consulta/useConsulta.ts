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
  return /(solteira|divorciad|separad)/i.test(v);
}
function isNamorando(v: string | undefined) {
  return !!v && /namor/i.test(v);
}
function isUniaoOuCasada(v: string | undefined) {
  return !!v && /(uni[aã]o|casad|casamento|esposa|marido|c[oô]njuge)/i.test(v);
}
function querDivorciar(ctx: OnboardingCtx) {
  const blob = `${ctx.estado_civil ?? ""} ${ctx.motivacao_principal ?? ""}`.toLowerCase();
  return /(divorciar|me separar|quero (a )?separa|pedir (o )?div[oó]rcio|sair do casamento)/i.test(blob);
}

type Answers = Record<string, string>;

function matchAny(v: string | undefined, re: RegExp) {
  return !!v && re.test(v);
}

function buildQuestions(ctx: OnboardingCtx, answers: Answers = {}): Question[] {
  const qs: Question[] = [];
  const querDiv = querDivorciar(ctx);
  const q1Ans = answers.q1 ?? "";
  const planejandoSilencio = matchAny(q1Ans, /sil[eê]ncio|planejando|ainda n[aã]o sabe|n[aã]o sabe ainda/i);
  const eleSabeResiste = matchAny(q1Ans, /resiste|n[aã]o aceita|n[aã]o concorda/i);
  const eleSabeConcorda = matchAny(q1Ans, /concorda|j[aá] sabe e concorda|de acordo/i);
  const jaProcurouAdv = matchAny(q1Ans, /procurei advogad|j[aá] tenho advogad/i);

  // Q1 — depende do estado civil e da intenção
  if (querDiv) {
    qs.push({
      id: "q1",
      text: "Você me contou que quer se divorciar. Para eu te ajudar com precisão: seu marido já sabe dessa decisão, ou ainda é algo que você está planejando em silêncio?",
      options: [
        "Ele já sabe e concorda",
        "Ele sabe mas resiste",
        "Ainda estou planejando em silêncio",
        "Já procurei advogado(a)",
      ],
    });
  } else if (isSolteiraOuDiv(ctx.estado_civil)) {
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

  // Q2 — só se tem filhos, e adaptada ao contexto
  if (temFilhos(ctx.tem_filhos)) {
    if (querDiv && planejandoSilencio) {
      qs.push({
        id: "q2",
        text: "Como você imagina a situação dos seus filhos quando o divórcio acontecer? Já pensou em guarda, pensão ou em como contar pra eles?",
        options: [
          "Quero a guarda comigo",
          "Penso em guarda compartilhada",
          "Ainda não pensei nisso",
          "Tenho medo da reação dele",
        ],
      });
    } else if (querDiv && eleSabeResiste) {
      qs.push({
        id: "q2",
        text: "Como vocês têm tratado a questão dos filhos diante da resistência dele? Já conversaram sobre guarda e pensão?",
        options: [
          "Conversamos, sem acordo",
          "Ele usa os filhos como pressão",
          "Ainda não tocamos no assunto",
          "Já está na Justiça",
        ],
      });
    } else if (querDiv && (eleSabeConcorda || jaProcurouAdv)) {
      qs.push({
        id: "q2",
        text: "Sobre os filhos: vocês já definiram como ficará a guarda e a pensão, ou ainda está sendo conversado?",
        options: [
          "Já temos um acordo verbal",
          "Vamos formalizar no divórcio",
          "Está em discussão",
          "Já está na Justiça",
        ],
      });
    } else if (isSolteiraOuDiv(ctx.estado_civil)) {
      qs.push({
        id: "q2",
        text: "Sobre seus filhos: como está hoje a guarda e a pensão com o pai deles?",
        options: ["Tenho a guarda e recebo pensão", "Tenho a guarda, sem pensão", "Guarda compartilhada", "Está na Justiça", "Pai ausente"],
      });
    } else {
      qs.push({
        id: "q2",
        text: "Me conta sobre seus filhos: existe algum acordo ou processo em andamento sobre guarda e pensão, ou hoje está tudo tranquilo?",
        options: ["Tudo tranquilo", "Acordo informal", "Acordo formal", "Está na Justiça"],
      });
    }
  }

  // Q3 — violência
  qs.push({
    id: "q3",
    text: "Existe ou já existiu alguma situação de violência — física, psicológica ou financeira — no seu relacionamento atual ou passado?",
    options: ["Não, nunca", "Já existiu, mas passou", "Estou passando por isso"],
  });

  // Bloco 2 — imóveis, adaptado
  if (querDiv && planejandoSilencio) {
    qs.push({
      id: "q4",
      text: "Pensando no patrimônio: existem imóveis no nome de vocês? Estão no seu nome, no dele ou compartilhados?",
      options: ["Não temos imóveis", "Só no meu nome", "Só no nome dele", "Compartilhado", "Em financiamento"],
    });
  } else {
    qs.push({
      id: "q4",
      text: "Você tem imóveis? Se sim, estão no seu nome, no nome do parceiro ou são compartilhados?",
      options: ["Não tenho imóveis", "Só no meu nome", "Só no nome dele", "Compartilhado", "Em financiamento"],
    });
  }

  qs.push({
    id: "q5",
    text: querDiv
      ? "Pensando em independência financeira: você tem renda própria hoje? Como está sua situação?"
      : "Como está sua situação financeira hoje? Você tem renda própria?",
    options: ["Sim, renda própria e estável", "Renda própria mas irregular", "Dependo financeiramente dele", "Estou desempregada"],
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

  // Q11 — aberta, adaptada
  qs.push({
    id: "q11",
    text:
      querDiv && planejandoSilencio
        ? "Para fechar: existe algo que você ainda não me contou e que te tira o sono nesse planejamento? Pode ser um medo, uma dúvida ou algo prático que te trava."
        : "Para fechar, quero que você me conte livremente: existe algo que ainda não perguntei mas que você sente que é importante para o seu perfil? Pode ser qualquer coisa — um medo, uma dúvida, uma situação específica.",
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
  const [erroGeracao, setErroGeracao] = useState(false);

  const ctxRef = useRef<OnboardingCtx>({});
  const questionsRef = useRef<Question[]>([]);
  const currentIndexRef = useRef(-1);
  const respostasRef = useRef<{ question: string; answer: string }[]>([]);
  const answersMapRef = useRef<Answers>({});
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
    setErroGeracao(false);
    setIsGenerating(true);
    setProgress(95);

    console.log("🔄 Iniciando geração do perfil...");
    console.log("📋 Contexto:", ctxRef.current);
    console.log("💬 Respostas da consulta:", respostasRef.current);

    let res: Awaited<ReturnType<typeof callGenerate>> | null = null;
    try {
      res = await callGenerate({
        data: {
          onboarding: ctxRef.current as Record<string, string>,
          respostas: respostasRef.current,
        },
      });
      console.log("🤖 Resposta do generateProfile:", res);
    } catch (e) {
      console.error("❌ generateProfile call failed", e);
      setErroGeracao(true);
      return;
    }

    if (!res || !res.ok || !res.profile) {
      console.error("❌ generateProfile não retornou perfil válido", res);
      setErroGeracao(true);
      return;
    }

    if (!user) {
      console.error("❌ Usuário ausente ao salvar perfil");
      setErroGeracao(true);
      return;
    }

    const p = res.profile as Record<string, unknown>;
    console.log("✅ JSON do perfil pronto:", p);

    const { error: upsertError } = await supabase
      .from("profile_data")
      .upsert(
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

    if (upsertError) {
      console.error("❌ Erro ao salvar no Supabase:", upsertError);
      setErroGeracao(true);
      return;
    }

    console.log("✅ Perfil salvo no Supabase com sucesso!");
    setProgress(100);
    navigate({ to: "/perfil" });
  }, [callGenerate, navigate, user]);

  const retryGerar = useCallback(() => {
    setErroGeracao(false);
    void finalize();
  }, [finalize]);

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
      answersMapRef.current[q.id] = trimmed;
      // Recompute remaining questions with the latest answers so wording adapts
      questionsRef.current = buildQuestions(ctxRef.current, answersMapRef.current);

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
    erroGeracao,
    retryGerar,
  };
}
