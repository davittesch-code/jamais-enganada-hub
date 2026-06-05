import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sofiaSpeak } from "@/lib/sofia.functions";


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

export function useOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const speak = useServerFn(sofiaSpeak);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showCtaButton, setShowCtaButton] = useState(false);
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
            "Antes de mergulharmos na sua consulta, quero te conhecer um pouquinho. Vou fazer algumas perguntas — responde com suas próprias palavras, do seu jeito, sem pressa. Aqui é um espaço seguro. 🌸",
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
    [addMessage, finishOnboarding, inputDisabled, schedule, speak, user],
  );

  return {
    messages,
    isTyping,
    progress,
    isComplete,
    showCtaButton,
    handleUserReply,
    onboardingData,
    inputDisabled,
  };
}
