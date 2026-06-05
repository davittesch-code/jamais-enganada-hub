import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

const InputSchema = z.object({
  onboarding: z.record(z.string(), z.string()).default({}),
  respostas: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .min(1),
});

const SYSTEM_PROMPT = `Você é uma assessora jurídica especializada em direitos da mulher no Brasil.
Com base nas respostas da consulta, gere um perfil jurídico completo em JSON.
Use a legislação brasileira: Código Civil, Lei Maria da Penha, CLT, Código Tributário,
Lei de Alimentos, Lei de Guarda Compartilhada e jurisprudência STJ/STF.
Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.

Estrutura obrigatória do JSON:
{
  "areas": {
    "familia": { "status": "atencao|ok|critico", "resumo": "texto" },
    "relacionamento": { "status": "atencao|ok|critico", "resumo": "texto" },
    "patrimonio": { "status": "atencao|ok|critico", "resumo": "texto" },
    "financeiro": { "status": "atencao|ok|critico", "resumo": "texto" },
    "empresa": { "status": "atencao|ok|critico|nao_aplicavel", "resumo": "texto" },
    "heranca": { "status": "atencao|ok|critico", "resumo": "texto" },
    "trabalhista": { "status": "atencao|ok|critico", "resumo": "texto" }
  },
  "radar_scores": {
    "familia": 0-100,
    "relacionamento": 0-100,
    "patrimonio": 0-100,
    "financeiro": 0-100,
    "empresa": 0-100,
    "heranca": 0-100,
    "trabalhista": 0-100
  },
  "insights": [
    {
      "area": "nome da area",
      "titulo": "titulo curto",
      "descricao": "explicacao simples, max 3 linhas",
      "lei_referencia": "ex: Art. 1.723 do Código Civil"
    }
  ],
  "attention_points": [
    {
      "nivel": "alto|medio|baixo",
      "area": "nome da area",
      "titulo": "titulo",
      "descricao": "o que está em risco e por que",
      "acao_imediata": "o que ela deve fazer agora"
    }
  ],
  "next_steps": [
    {
      "ordem": 1,
      "titulo": "titulo da acao",
      "descricao": "o que fazer de forma pratica",
      "prazo": "imediato|curto_prazo|medio_prazo",
      "area": "nome da area"
    }
  ],
  "resumo_geral": "paragrafo de 3-4 linhas humanizado",
  "nivel_vulnerabilidade": "baixo|medio|alto",
  "frase_de_forca": "frase curta e poderosa personalizada usando o nome dela"
}`;

function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const generateProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("generateProfile: LOVABLE_API_KEY ausente");
      return { ok: false as const, error: "missing_key", profile: null };
    }

    const ctx = data.onboarding;
    const userPrompt = `Dados do onboarding:
Nome: ${ctx.nome ?? ""}
Idade: ${ctx.idade ?? ""}
Estado: ${ctx.estado ?? ""}
Estado civil: ${ctx.estado_civil ?? ""}
Tem filhos: ${ctx.tem_filhos ?? ""}
Tem empresa: ${ctx.tem_empresa ?? ""}
Tem bens: ${ctx.tem_bens ?? ""}
Motivação principal: ${ctx.motivacao_principal ?? ""}

Respostas da consulta:
${data.respostas.map((r) => `${r.question}: ${r.answer}`).join("\n")}`;

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
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("generateProfile gateway error:", res.status, body);
        return { ok: false as const, error: `gateway_${res.status}`, profile: null };
      }

      const json = await res.json();
      const text: string | undefined = json?.choices?.[0]?.message?.content;
      if (!text) {
        return { ok: false as const, error: "empty_response", profile: null };
      }
      const parsed = extractJson(text);
      if (!parsed) {
        console.error("generateProfile: JSON parse failed", text.slice(0, 500));
        return { ok: false as const, error: "invalid_json", profile: null };
      }
      return { ok: true as const, profile: parsed, error: null };
    } catch (e) {
      console.error("generateProfile exception:", e);
      return { ok: false as const, error: "exception", profile: null };
    }
  });
