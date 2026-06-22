import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sofiaSpeak } from "@/lib/sofia.functions";
import {
  loadProgresso,
  markProgressoConcluido,
  saveProgresso,
} from "@/components/consulta/progresso";


type Sender = "sofia" | "user";

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
}

export interface OnboardingData {
  nome?: string;
  idade?: string;
  estado?: string;
  estado_civil?: string;
  tem_filhos?: string;
  tem_empresa?: string;
  tem_bens?: string;
  motivacao_principal?: string;
}

type QuestionKey = keyof OnboardingData;

const QUESTIONS: { key: QuestionKey; text: string }[] = [
  { key: "nome", text: "Qual é o seu nome?" },
  { key: "idade", text: "Quantos anos você tem?" },
  { key: "estado", text: "Em qual estado você mora?" },
  {
    key: "estado_civil",
    text:
      "Qual é a sua situação de relacionamento atual? (solteira, namorando, em união estável, casada, separada ou divorciada)",
  },
  { key: "tem_filhos", text: "Você tem filhos? Se sim, quantos?" },
  {
    key: "tem_empresa",
    text:
      "Você tem ou já teve algum negócio, empresa ou atividade como autônoma?",
  },
  {
    key: "tem_bens",
    text: "Você possui bens em seu nome? (imóvel, veículo, investimentos...)",
  },
  {
    key: "motivacao_principal",
    text:
      "Existe alguma situação que está te preocupando hoje — algo que te fez buscar a Jamais Enganada?",
  },
];

// Sofia's AI responses are generated via the Lovable AI Gateway in
// src/lib/sofia.functions.ts (server-side, no client-side API key).


function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Tempo de digitação realista (1500-4500ms) baseado no tamanho da mensagem
function calcTypingDelay(texto: string): number {
  const base = 800;
  const porCaractere = texto.length * 30;
  const jitter = Math.random() * 400;
  return Math.min(Math.max(base + porCaractere + jitter, 1500), 4500);
}

// Pausa natural entre confirmação e próxima pergunta (1000-1800ms)
function calcPauseDelay(): number {
  return 1000 + Math.random() * 800;
}

export interface AdvogadaOpt {
  id: string;
  nome: string;
  oab: string;
  especialidade: string | null;
}

export function useOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const speak = useServerFn(sofiaSpeak);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showCtaButton, setShowCtaButton] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [inputDisabled, setInputDisabled] = useState(true);
  const [showAdvogadaPicker, setShowAdvogadaPicker] = useState(false);
  const [advogadas, setAdvogadas] = useState<AdvogadaOpt[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  const currentIndexRef = useRef(-1);
  const dataRef = useRef<OnboardingData>({});
  const hasStartedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const checkedExistingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const concluidoRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserRepliedRef = useRef(false);
  const lastSofiaTextRef = useRef<{ text: string; at: number } | null>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  const addMessage = useCallback((sender: Sender, text: string) => {
    // Dedup: não enfileirar mensagem idêntica da Sofia se a anterior idêntica
    // foi enviada há menos de 8s (proteção contra duplicação de inicialização).
    if (sender === "sofia") {
      const last = lastSofiaTextRef.current;
      if (last && last.text === text && Date.now() - last.at < 8000) {
        return;
      }
      lastSofiaTextRef.current = { text, at: Date.now() };
    }
    setMessages((prev) => [
      ...prev,
      { id: uid(), sender, text, timestamp: new Date() },
    ]);
  }, []);

  // Debounced save do progresso atual para Supabase (~500ms).
  // IMPORTANTE: só persiste depois que a usuária respondeu pelo menos uma vez,
  // para que o fluxo de boas-vindas não vire "progresso" e dispare o fluxo
  // de "retomar" em um remount (StrictMode, HMR, troca de rota etc.).
  const scheduleSave = useCallback(() => {
    if (!user || concluidoRef.current) return;
    if (!hasUserRepliedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        await saveProgresso({
          userId: user.id,
          etapa: "onboarding",
          mensagens: messagesRef.current,
          contexto: { data: dataRef.current },
          indiceAtual: currentIndexRef.current,
        });
        setSavedFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2000);
      })();
    }, 500);
  }, [user]);

  // Sempre que as mensagens mudarem, atualizar o ref e agendar um save.
  useEffect(() => {
    messagesRef.current = messages;
    if (hasStartedRef.current && messages.length > 0) scheduleSave();
  }, [messages, scheduleSave]);

  // Check if already onboarded; if not, run welcome block once
  useEffect(() => {
    if (!user || hasStartedRef.current || checkedExistingRef.current) return;
    checkedExistingRef.current = true;

    (async () => {
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

        // RETOMAR onboarding salvo (se não concluído)
        const progresso = await loadProgresso(user.id, "onboarding");
        if (progresso) {
          const ctxData =
            ((progresso.contexto as { data?: OnboardingData } | null) ?? {}).data ??
            {};
          dataRef.current = ctxData;
          setOnboardingData(ctxData);
          currentIndexRef.current = progresso.indice_atual ?? 0;

          const restored: Message[] = Array.isArray(progresso.mensagens)
            ? (progresso.mensagens as Message[]).map((m) => ({
                id: String(m.id ?? uid()),
                sender: m.sender,
                text: String(m.text ?? ""),
                timestamp: new Date(
                  (m.timestamp as unknown as string) ?? Date.now(),
                ),
              }))
            : [];
          setMessages(restored);
          messagesRef.current = restored;
          // Semeia o dedup com a última fala da Sofia restaurada.
          const lastSofia = [...restored].reverse().find((m) => m.sender === "sofia");
          if (lastSofia) {
            lastSofiaTextRef.current = { text: lastSofia.text, at: Date.now() };
          }
          setProgress(Math.round((currentIndexRef.current / 8) * 88));
          hasStartedRef.current = true;
          // Já existe progresso salvo → considera que a usuária já interagiu.
          hasUserRepliedRef.current = true;

          const idx = currentIndexRef.current;
          const currentQuestionText =
            idx >= 0 && idx < QUESTIONS.length ? QUESTIONS[idx].text : null;
          // Se a última fala da Sofia já é exatamente a pergunta atual,
          // não precisamos reenviar saudação nem re-perguntar — só reabilitar input.
          if (currentQuestionText && lastSofia && lastSofia.text === currentQuestionText) {
            setInputDisabled(false);
            return;
          }

          schedule(() => {
            setIsTyping(true);
            schedule(() => {
              setIsTyping(false);
              addMessage(
                "sofia",
                "Que bom te ver de novo! 💜 Vamos continuar de onde paramos.",
              );
              if (currentQuestionText) {
                schedule(() => {
                  setIsTyping(true);
                  schedule(() => {
                    setIsTyping(false);
                    addMessage("sofia", currentQuestionText);
                    setInputDisabled(false);
                  }, calcTypingDelay(currentQuestionText));
                }, calcPauseDelay());
              } else {
                // Estávamos na etapa do advogada picker
                schedule(() => {
                  void (async () => {
                    setIsTyping(true);
                    try {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const { data } = await (supabase as any).rpc(
                        "list_advogadas_publicas",
                      );
                      setAdvogadas((data as unknown as AdvogadaOpt[]) ?? []);
                    } catch (e) {
                      console.error("advogadas fetch failed", e);
                    }
                    setIsTyping(false);
                    const nome = dataRef.current.nome ?? "";
                    addMessage(
                      "sofia",
                      `${nome}, quase pronto! Uma última coisa: você tem uma advogada de confiança cadastrada na plataforma? Selecione abaixo para vincular sua assessoria:`,
                    );
                    setProgress(95);
                    setShowAdvogadaPicker(true);
                  })();
                }, calcPauseDelay());
              }
            }, 1200);
          }, 400);
          return;
        }

        const { data: or } = await supabase
          .from("onboarding_responses")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (or && or.length > 0) {
          navigate({ to: "/consulta" });
          return;
        }
      } catch (e) {
        console.error("onboarding check failed", e);
      }


      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      schedule(
        () =>
          addMessage(
            "sofia",
            "Oi! Que bom que você está aqui. Eu sou a Sofia, sua assessora pessoal na Jamais Enganada. 💜",
          ),
        800,
      );
      schedule(
        () =>
          addMessage(
            "sofia",
            "Fui criada para te ajudar a entender seus direitos de um jeito simples, humano e sem aquele juridiquês que ninguém aguenta.",
          ),
        2800,
      );
      schedule(
        () =>
          addMessage(
            "sofia",
            "Antes de mergulharmos no seu tira-dúvidas, quero te conhecer um pouquinho. Vou fazer algumas perguntas — responde com suas próprias palavras, do seu jeito, sem pressa. Aqui é um espaço seguro. 🌸",
          ),
        5000,
      );
      schedule(() => {
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          addMessage("sofia", "Pode começar me dizendo... qual é o seu nome?");
          currentIndexRef.current = 0;
          setInputDisabled(false);
          setProgress(0);
        }, 1200);
      }, 7500);
    })();
  }, [user, navigate, schedule, addMessage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const finishOnboarding = useCallback(
    async (nome: string) => {
      setIsTyping(true);
      let closing = `${nome}, você foi muito corajosa em compartilhar tudo isso. Seu perfil jurídico já está sendo preparado com cada detalhe que você me contou. Vamos juntas para o próximo passo? 💜`;
      try {
        const res = await speak({ data: { kind: "closing", nome } });
        if (res?.text) closing = res.text;
      } catch (e) {
        console.error("sofiaSpeak closing failed", e);
      }
      setIsTyping(false);
      addMessage("sofia", closing);

      try {
        localStorage.setItem(
          "jamais_onboarding_context",
          JSON.stringify(dataRef.current),
        );
      } catch (e) {
        console.error("localStorage failed", e);
      }

      if (user && nome) {
        try {
          await supabase
            .from("profiles")
            .update({ full_name: nome })
            .eq("id", user.id);
        } catch (e) {
          console.error("profile update failed", e);
        }
      }

      setIsComplete(true);
      setProgress(100);
      setInputDisabled(true);

      // Marca progresso como concluído (não será retomado novamente)
      concluidoRef.current = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (user) {
        try {
          await saveProgresso({
            userId: user.id,
            etapa: "onboarding",
            mensagens: messagesRef.current,
            contexto: { data: dataRef.current },
            indiceAtual: currentIndexRef.current,
            concluido: true,
          });
          await markProgressoConcluido(user.id, "onboarding");
        } catch (e) {
          console.error("mark onboarding concluido failed", e);
        }
      }

      schedule(() => {
        addMessage(
          "sofia",
          "Estou com tudo que preciso. Agora é hora de criar o seu perfil jurídico. ✨",
        );
        schedule(() => {
          setShowCtaButton(true);
        }, 1500);
      }, 500);
    },
    [addMessage, schedule, speak, user],
  );



  const handleUserReply = useCallback(
    async (text: string) => {
      const index = currentIndexRef.current;
      if (index < 0 || index > 7 || inputDisabled) return;

      setInputDisabled(true);
      hasUserRepliedRef.current = true;
      addMessage("user", text);


      const question = QUESTIONS[index];
      const newData = { ...dataRef.current, [question.key]: text };
      dataRef.current = newData;
      setOnboardingData(newData);

      // Save to Supabase (silent on error)
      if (user) {
        try {
          await supabase.from("onboarding_responses").insert({
            user_id: user.id,
            step: "onboarding",
            question: question.text,
            answer: text,
          });
        } catch (e) {
          console.error("supabase insert failed", e);
        }
      }

      setIsTyping(true);
      let confirmation = "Entendido! 💜";
      try {
        const res = await speak({
          data: { kind: "confirmation", question: question.text, answer: text },
        });
        if (res?.text) confirmation = res.text;
      } catch (e) {
        console.error("sofiaSpeak confirmation failed", e);
      }
      setIsTyping(false);
      addMessage("sofia", confirmation);

      const nextIndex = index + 1;

      if (nextIndex < QUESTIONS.length) {
        const nextText = QUESTIONS[nextIndex].text;
        // Pausa natural após confirmação, depois nova digitação
        schedule(() => {
          setIsTyping(true);
          schedule(() => {
            setIsTyping(false);
            addMessage("sofia", nextText);
            currentIndexRef.current = nextIndex;
            setProgress(Math.round((nextIndex / 8) * 88));
            setInputDisabled(false);
          }, calcTypingDelay(nextText));
        }, calcPauseDelay());
      } else {
        currentIndexRef.current = 8;
        // Open advogada picker after Q8 confirmation
        schedule(() => {
          (async () => {
            setIsTyping(true);
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data } = await (supabase as any).rpc("list_advogadas_publicas");
              setAdvogadas(((data as unknown as AdvogadaOpt[]) ?? []));
            } catch (e) {
              console.error("advogadas fetch failed", e);
            }
            setIsTyping(false);
            const nome = newData.nome ?? "";
            addMessage(
              "sofia",
              `${nome}, quase pronto! Uma última coisa: você tem uma advogada de confiança cadastrada na plataforma? Selecione abaixo para vincular sua assessoria:`,
            );
            setProgress(95);
            setShowAdvogadaPicker(true);
          })();
        }, 800);
      }
    },
    [addMessage, inputDisabled, schedule, speak, user],
  );

  const submitAdvogadaSelection = useCallback(
    async (advogada: AdvogadaOpt | null) => {
      if (!showAdvogadaPicker) return;
      setShowAdvogadaPicker(false);

      if (advogada && user) {
        try {
          await supabase
            .from("profiles")
            .update({ advogado_id: advogada.id } as never)
            .eq("id", user.id);
          await supabase.from("onboarding_responses").insert({
            user_id: user.id,
            step: "onboarding",
            question: "Advogada selecionada",
            answer: advogada.nome,
          });
        } catch (e) {
          console.error("save advogada failed", e);
        }
        addMessage(
          "sofia",
          `Perfeito! Vinculei você à ${advogada.nome}. Ela poderá acompanhar sua jornada na plataforma. 💜`,
        );
      }

      schedule(() => {
        void finishOnboarding(dataRef.current.nome ?? "");
      }, advogada ? 1200 : 200);
    },
    [addMessage, finishOnboarding, schedule, showAdvogadaPicker, user],
  );

  return {
    messages,
    isTyping,
    progress,
    isComplete,
    showCtaButton,
    showSplash,
    setShowSplash,
    handleUserReply,
    onboardingData,
    inputDisabled,
    showAdvogadaPicker,
    advogadas,
    submitAdvogadaSelection,
    savedFlash,
  };
}
