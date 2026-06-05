import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_INSTRUCTION =
  "Você é Sofia, assessora jurídica empática da plataforma Jamais Enganada, uma plataforma de autocuidado jurídico para mulheres brasileiras. Seu tom é acolhedor, feminino, encorajador e profissional. Nunca use juridiquês. Use linguagem simples e calorosa. Quando a usuária responder uma pergunta, gere UMA frase curta de confirmação (máx. 2 linhas) que mostre que você ouviu a resposta dela e a faça sentir acolhida. Responda SOMENTE a confirmação, nada mais, sem aspas.";

async function callGemini(userText: string, system = SYSTEM_INSTRUCTION): Promise<string | null> {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch (e) {
    console.error("Gemini error", e);
    return null;
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [inputDisabled, setInputDisabled] = useState(true);

  const currentIndexRef = useRef(-1);
  const dataRef = useRef<OnboardingData>({});
  const hasStartedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const checkedExistingRef = useRef(false);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  const addMessage = useCallback((sender: Sender, text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), sender, text, timestamp: new Date() },
    ]);
  }, []);

  const askQuestion = useCallback(
    (index: number) => {
      setIsTyping(true);
      schedule(() => {
        setIsTyping(false);
        addMessage("sofia", QUESTIONS[index].text);
        currentIndexRef.current = index;
        setInputDisabled(false);
      }, 1000);
    },
    [addMessage, schedule],
  );

  // Check if already onboarded; if not, run welcome block once
  useEffect(() => {
    if (!user || hasStartedRef.current || checkedExistingRef.current) return;
    checkedExistingRef.current = true;

    (async () => {
      try {
        const { data } = await supabase
          .from("onboarding_responses")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (data && data.length > 0) {
          navigate({ to: "/perfil" });
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
            "Olá! Eu sou a Sofia, sua assessora jurídica pessoal aqui na Jamais Enganada. 💜",
          ),
        800,
      );
      schedule(
        () =>
          addMessage(
            "sofia",
            "Estou aqui para te ajudar a entender seus direitos e criar um perfil jurídico completamente personalizado para você.",
          ),
        2500,
      );
      schedule(
        () =>
          addMessage(
            "sofia",
            "Antes de começarmos sua consulta, preciso te conhecer melhor. Vou fazer algumas perguntas simples — responda com suas próprias palavras, sem pressa. 🌸",
          ),
        4500,
      );
      schedule(() => {
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          addMessage("sofia", QUESTIONS[0].text);
          currentIndexRef.current = 0;
          setInputDisabled(false);
          setProgress(0);
        }, 1200);
      }, 6500);
    })();
  }, [user, navigate, schedule, addMessage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const finishOnboarding = useCallback(
    async (nome: string) => {
      setIsTyping(true);
      const closingPrompt = `Gere uma mensagem de encerramento do onboarding usando o nome '${nome}' da usuária. Diga que o perfil dela está sendo preparado e que ela já pode iniciar a consulta jurídica completa. Tom: empolgante e acolhedor. Máx. 3 linhas. Sem aspas.`;
      const closing =
        (await callGemini(closingPrompt)) ??
        `${nome}, seu perfil já está sendo preparado com muito carinho. 💜 Você já pode iniciar sua consulta jurídica completa!`;
      setIsTyping(false);
      addMessage("sofia", closing);

      schedule(() => {
        addMessage(
          "sofia",
          "Clique no botão abaixo para começar sua consulta jurídica personalizada. Estou ansiosa para te ajudar! 💜",
        );
      }, 2000);

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
    },
    [addMessage, schedule, user],
  );

  const handleUserReply = useCallback(
    async (text: string) => {
      const index = currentIndexRef.current;
      if (index < 0 || index > 7 || inputDisabled) return;

      setInputDisabled(true);
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
      const confirmationPrompt = `A usuária respondeu '${text}' para a pergunta '${question.text}'. Gere a confirmação empática.`;
      const confirmation = (await callGemini(confirmationPrompt)) ?? "Entendido! 💜";
      setIsTyping(false);
      addMessage("sofia", confirmation);

      const nextIndex = index + 1;

      if (nextIndex < QUESTIONS.length) {
        schedule(() => {
          setIsTyping(true);
          schedule(() => {
            setIsTyping(false);
            addMessage("sofia", QUESTIONS[nextIndex].text);
            currentIndexRef.current = nextIndex;
            setProgress(Math.round((nextIndex / 8) * 88));
            setInputDisabled(false);
          }, 1000);
        }, 800);
      } else {
        currentIndexRef.current = 8;
        schedule(() => {
          void finishOnboarding(newData.nome ?? "");
        }, 1000);
      }
    },
    [addMessage, finishOnboarding, inputDisabled, schedule, user],
  );

  return {
    messages,
    isTyping,
    progress,
    isComplete,
    handleUserReply,
    onboardingData,
    inputDisabled,
  };
}
