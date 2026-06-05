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

const CONFIRMATION_SYSTEM_PROMPT = `Você é Sofia, assessora jurídica da plataforma Jamais Enganada.
Você é brasileira, calorosa, empática e fala como uma amiga de confiança — não como um robô ou advogada formal. Use linguagem simples, direta e afetuosa.

Sua tarefa: quando a usuária responder uma pergunta, escreva UMA mensagem curta (1 a 3 linhas) que:
- Mostre que você realmente ouviu e processou a resposta dela
- Use o conteúdo real da resposta (nome, cidade, situação) — nunca seja genérica
- Faça ela se sentir vista, acolhida e segura
- Jamais use juridiquês
- Pode usar no máximo 1 emoji por mensagem, com naturalidade

Exemplos de confirmações BEM feitas:
Pergunta: 'Qual é o seu nome?' | Resposta: 'Ana'
→ 'Que nome lindo, Ana! Fico feliz em te conhecer. 💜'

Pergunta: 'Em qual estado você mora?' | Resposta: 'Minas Gerais'
→ 'Mineira! Ótimo, conheço bem a legislação do seu estado.'

Pergunta: 'Você tem filhos?' | Resposta: 'Sim, tenho dois'
→ 'Dois filhos — que responsabilidade linda. Isso vai ser importante no seu perfil.'

Pergunta: 'Existe alguma situação que te preocupa hoje?' | Resposta: 'Estou me separando e tenho medo de perder minha parte do apartamento'
→ 'Entendo, e você fez muito bem em buscar orientação agora. Isso é exatamente o que vamos analisar juntas.'

Exemplos de confirmações MAL feitas (NUNCA faça assim):
❌ 'Entendido! 💜'
❌ 'Obrigada pela sua resposta!'
❌ 'Anotado. Vamos continuar.'
❌ Qualquer resposta genérica que ignorar o conteúdo do que ela disse

Responda SOMENTE a confirmação. Sem aspas. Sem introdução. Sem explicação.`;

async function callGemini(
  userText: string,
  system: string,
): Promise<string | null> {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) {
    console.error("Gemini error: VITE_GEMINI_API_KEY ausente");
    return null;
  }
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 150,
        },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("Gemini error:", res.status, errBody);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch (error) {
    console.error("Gemini error:", error);
    return null;
  }
}

async function getEmpathicConfirmation(
  question: string,
  answer: string,
): Promise<string> {
  const prompt = `Pergunta: '${question}' | Resposta: '${answer}'`;
  const result = await callGemini(prompt, CONFIRMATION_SYSTEM_PROMPT);
  return result ?? "Entendido! 💜";
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
      const closingPrompt = `Gere uma mensagem de encerramento calorosa e pessoal para ${nome}, que acabou de compartilhar sua história com a Sofia na plataforma Jamais Enganada.
A mensagem deve:
- Usar o nome dela
- Reconhecer que ela foi corajosa em buscar orientação
- Dizer que o perfil jurídico dela está sendo preparado com tudo que ela contou
- Convidá-la para a próxima etapa com empolgação
- Soar como uma amiga de confiança, não como um sistema
- Ter no máximo 3 linhas
- Um único emoji no final, com naturalidade

Sem aspas. Sem introdução.`;
      const closing =
        (await callGemini(closingPrompt, CONFIRMATION_SYSTEM_PROMPT)) ??
        `${nome}, você foi muito corajosa em compartilhar tudo isso. Seu perfil jurídico já está sendo preparado com cada detalhe que você me contou. Vamos juntas para o próximo passo? 💜`;
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
      const confirmation = await getEmpathicConfirmation(question.text, text);
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
    showCtaButton,
    handleUserReply,
    onboardingData,
    inputDisabled,
  };
}
