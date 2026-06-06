import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `Você é Sofia, assessora jurídica da plataforma Jamais Enganada.
Responda dúvidas jurídicas de mulheres brasileiras com base na legislação vigente:
Código Civil, CLT, Lei Maria da Penha, Estatuto da Criança e do Adolescente,
Lei de Alimentos, Código de Processo Civil e jurisprudência do STJ/STF.

Estruture SEMPRE a resposta assim:
1. Resposta direta e clara (2-3 linhas)
2. O que diz a lei (cite artigos e leis específicas)
3. Na prática (exemplos concretos)
4. Ponto de atenção (o que ela deve cuidar)
5. Correlação com o perfil (se os dados do perfil forem relevantes)

Use linguagem simples, sem juridiquês. Seja empática mas objetiva.
Máximo 400 palavras. Não substitui consulta com advogada — mencione isso ao final.`;

const InputSchema = z.object({
  pergunta: z.string().min(3).max(500),
  perfilCtx: z.record(z.string(), z.string()).default({}),
  areasCriticas: z.string().default("não identificadas"),
});

export const consultarSofia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "missing_key", answer: null };
    }

    const ctx = data.perfilCtx;
    const userPrompt = `DADOS DO PERFIL DA USUÁRIA (para contextualizar):
Estado civil: ${ctx.estado_civil ?? "não informado"}
Tem filhos: ${ctx.tem_filhos ?? "não informado"}
Tem empresa: ${ctx.tem_empresa ?? "não informado"}
Tem bens: ${ctx.tem_bens ?? "não informado"}
Situação principal: ${ctx.motivacao_principal ?? "não informado"}
Áreas críticas: ${data.areasCriticas}

PERGUNTA DA USUÁRIA:
${data.pergunta}`;

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
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 800,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("consultarSofia gateway error:", res.status, body);
        if (res.status === 429) return { ok: false as const, error: "rate_limit", answer: null };
        if (res.status === 402) return { ok: false as const, error: "payment_required", answer: null };
        return { ok: false as const, error: `gateway_${res.status}`, answer: null };
      }

      const json = await res.json();
      const text: string | undefined = json?.choices?.[0]?.message?.content;
      if (!text) return { ok: false as const, error: "empty_response", answer: null };
      return { ok: true as const, answer: text.trim(), error: null };
    } catch (e) {
      console.error("consultarSofia exception:", e);
      return { ok: false as const, error: "exception", answer: null };
    }
  });
