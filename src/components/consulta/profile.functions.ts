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
Gere um perfil jurídico completo e ÚTIL — não apenas diagnóstico. Para cada área, além de identificar o problema, INFORME O DIREITO correspondente em linguagem simples.

Princípio central: toda área crítica deve ser acompanhada de "MAS você tem este direito" — cite a lei de forma acessível. A mulher deve sair do perfil mais informada e aliviada, não mais angustiada.

Use: Código Civil, Lei Maria da Penha, CLT, Lei de Alimentos, Lei de Guarda Compartilhada e jurisprudência STJ/STF.

Para áreas em que a usuária NÃO soube responder (informadas em dados_faltantes na meta-entrada):
- NÃO deixe vazio nem marque 'nao_aplicavel'
- status: 'atencao'
- marque dado_faltante: true
- resumo: explique o que ela precisa descobrir e por quê é importante
- gere um next_step concreto: 'Descubra [informação] fazendo [ação concreta]'

Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.

Estrutura obrigatória do JSON:
{
  "areas": {
    "familia": {
      "status": "ok|atencao|critico|nao_aplicavel",
      "resumo": "descrição da situação em linguagem simples",
      "direito_correspondente": "o que a lei garante para ela nesta situação — mesmo nas áreas críticas, informe o direito. Ex: 'Mesmo que o imóvel esteja só no nome dele, em Comunhão Parcial você tem direito à metade — Art. 1.658 CC'",
      "dado_faltante": true
    },
    "relacionamento": { "status": "...", "resumo": "...", "direito_correspondente": "...", "dado_faltante": false },
    "patrimonio": { "status": "...", "resumo": "...", "direito_correspondente": "...", "dado_faltante": false },
    "financeiro": { "status": "...", "resumo": "...", "direito_correspondente": "...", "dado_faltante": false },
    "empresa": { "status": "...", "resumo": "...", "direito_correspondente": "...", "dado_faltante": false },
    "heranca": { "status": "...", "resumo": "...", "direito_correspondente": "...", "dado_faltante": false },
    "trabalhista": { "status": "...", "resumo": "...", "direito_correspondente": "...", "dado_faltante": false }
  },
  "radar_scores": {
    "familia": 0-100, "relacionamento": 0-100, "patrimonio": 0-100, "financeiro": 0-100, "empresa": 0-100, "heranca": 0-100, "trabalhista": 0-100
  },
  "insights": [
    {
      "area": "nome da area",
      "titulo": "titulo curto",
      "descricao": "explicação clara do ponto jurídico — máx 3 linhas",
      "direito_aplicavel": "o direito que ela TEM nesta situação",
      "lei_referencia": "ex: Art. 1.723 CC / Lei 11.340/2006 / Súmula 377 STF"
    }
  ],
  "attention_points": [
    {
      "nivel": "alto|medio|baixo",
      "area": "nome da area",
      "titulo": "titulo",
      "descricao": "o risco real em linguagem simples",
      "direito_que_protege": "o direito ou mecanismo legal que a protege",
      "acao_imediata": "o que fazer agora — prático e específico"
    }
  ],
  "next_steps": [
    {
      "ordem": 1,
      "titulo": "titulo da ação",
      "descricao": "ação prática e específica",
      "prazo": "imediato|curto_prazo|medio_prazo",
      "area": "nome da area"
    }
  ],
  "perguntas_sugeridas": {
    "familia": ["Pergunta pronta que ela pode fazer no tira-dúvidas", "Segunda pergunta sugerida", "Terceira pergunta sugerida"]
  },
  "resumo_geral": "3-4 linhas humanizadas sobre o perfil desta mulher — mencione pelo menos 1 direito que ela tem, não só os riscos",
  "nivel_vulnerabilidade": "baixo|medio|alto",
  "frase_de_forca": "frase curta e poderosa personalizada usando o nome dela"
}

Em perguntas_sugeridas, gere 3 perguntas por área crítica/atenção, priorizando as áreas com status 'critico'. Use a chave da área (familia, relacionamento, patrimonio, financeiro, empresa, heranca, trabalhista).`;

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
          max_tokens: 8000,
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
