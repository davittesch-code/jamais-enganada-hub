import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

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

const ClosingSchema = z.object({
  kind: z.literal("closing"),
  nome: z.string().min(1).max(120),
});

const ConfirmationSchema = z.object({
  kind: z.literal("confirmation"),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
});

const InputSchema = z.union([ConfirmationSchema, ClosingSchema]);

async function callGateway(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.error("Sofia: LOVABLE_API_KEY ausente");
    return null;
  }

  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("Sofia gateway error:", res.status, errBody);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  } catch (error) {
    console.error("Sofia gateway exception:", error);
    return null;
  }
}

export const sofiaSpeak = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.kind === "confirmation") {
      const userPrompt = `Pergunta: '${data.question}' | Resposta: '${data.answer}'`;
      const text = await callGateway(CONFIRMATION_SYSTEM_PROMPT, userPrompt);
      return { text: text ?? "Entendido! 💜", fallback: text === null };
    }

    const closingPrompt = `Gere uma mensagem de encerramento calorosa e pessoal para ${data.nome}, que acabou de compartilhar sua história com a Sofia na plataforma Jamais Enganada.
A mensagem deve:
- Usar o nome dela
- Reconhecer que ela foi corajosa em buscar orientação
- Dizer que o perfil jurídico dela está sendo preparado com tudo que ela contou
- Convidá-la para a próxima etapa com empolgação
- Soar como uma amiga de confiança, não como um sistema
- Ter no máximo 3 linhas
- Um único emoji no final, com naturalidade

Sem aspas. Sem introdução.`;
    const text = await callGateway(CONFIRMATION_SYSTEM_PROMPT, closingPrompt);
    return {
      text:
        text ??
        `${data.nome}, você foi muito corajosa em compartilhar tudo isso. Seu perfil jurídico já está sendo preparado com cada detalhe que você me contou. Vamos juntas para o próximo passo? 💜`,
      fallback: text === null,
    };
  });
