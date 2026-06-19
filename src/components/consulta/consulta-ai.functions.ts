import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const InputSchema = z.object({
  contexto: z.record(z.string(), z.string()).default({}),
  perguntas: z
    .array(z.object({ key: z.string(), text: z.string() }))
    .min(1)
    .max(20),
});

const SYSTEM_PROMPT = `Você é Sofia, assessora jurídica da Jamais Enganada conduzindo uma consulta.
Você JÁ SABE várias informações sobre a usuária (no contexto do usuário). Sua tarefa é avaliar a PRÓXIMA leva de perguntas que o sistema quer fazer e, para cada uma, decidir a ação correta — EVITANDO repetir o que já se sabe.

REGRAS DE DECISÃO (por pergunta):
- "pular": quando a resposta já é totalmente conhecida ou claramente inferível pelo contexto.
  Exemplos:
    • Usuária disse no onboarding/respostas anteriores que "não trabalha" → pular pergunta sobre situação profissional.
    • Usuária disse que "depende financeiramente do parceiro" → pular faixa de renda (já está claro que é "sem renda própria").
    • Usuária disse que "não tem filhos" → pular qualquer pergunta sobre filhos.
    • Usuária disse "não tenho empresa / nunca tive" → pular perguntas sobre empresa.
- "adaptar": quando a pergunta ainda faz sentido, mas deve ser reformulada considerando o que ela já contou.
  Exemplo: ela disse que tem 2 filhos → adaptar "qual a idade dos seus filhos?" para "sobre seus 2 filhos, eles são menores de idade?".
- "perguntar": quando a informação ainda é desconhecida e a pergunta original está adequada.

IMPORTANTE:
- Seja GENEROSA com "pular" e "adaptar". Nada quebra mais a experiência do que perguntar algo já respondido.
- O tom da "confirmacao" (quando pular) deve ser caloroso e mostrar que Sofia OUVIU. Use no máximo 1 emoji. Exemplo: "Como você me contou que não trabalha no momento, vou seguir para o próximo ponto. 💜"
- A "pergunta_adaptada" (quando adaptar) deve soar natural, em primeira pessoa da Sofia, integrando o contexto.

FORMATO DE RESPOSTA (JSON estrito, sem markdown):
{
  "decisoes": [
    {
      "key": "<a mesma key da pergunta>",
      "acao": "perguntar" | "pular" | "adaptar",
      "motivo": "explicação curta (1 linha)",
      "pergunta_adaptada": "se acao=adaptar, a nova formulação; senão string vazia",
      "confirmacao": "se acao=pular, frase curta e empática da Sofia; senão string vazia"
    }
  ]
}

Responda APENAS com o JSON. Sem texto antes ou depois.`;

export const evaluateConsultaBlock = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("evaluateConsultaBlock: LOVABLE_API_KEY ausente");
      return { ok: false as const, decisoes: [] };
    }

    const userPrompt = `CONTEXTO JÁ CONHECIDO DA USUÁRIA:
${JSON.stringify(data.contexto, null, 2)}

PRÓXIMAS PERGUNTAS QUE O SISTEMA QUER FAZER:
${data.perguntas.map((p) => `- key: ${p.key}\n  pergunta: "${p.text}"`).join("\n")}

Avalie cada uma e retorne o JSON conforme instruído.`;

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
          max_tokens: 1800,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("evaluateConsultaBlock gateway error:", res.status, body);
        return { ok: false as const, decisoes: [] };
      }

      const json = await res.json();
      const text: string | undefined = json?.choices?.[0]?.message?.content;
      if (!text) return { ok: false as const, decisoes: [] };

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first >= 0 && last > first) {
          try {
            parsed = JSON.parse(text.slice(first, last + 1));
          } catch {
            return { ok: false as const, decisoes: [] };
          }
        } else {
          return { ok: false as const, decisoes: [] };
        }
      }

      const decisoesRaw = (parsed as { decisoes?: unknown })?.decisoes;
      const decisoes = Array.isArray(decisoesRaw)
        ? decisoesRaw
            .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
            .map((d) => ({
              key: String(d.key ?? ""),
              acao:
                d.acao === "pular" || d.acao === "adaptar" ? d.acao : "perguntar",
              motivo: typeof d.motivo === "string" ? d.motivo : "",
              pergunta_adaptada:
                typeof d.pergunta_adaptada === "string" ? d.pergunta_adaptada : "",
              confirmacao:
                typeof d.confirmacao === "string" ? d.confirmacao : "",
            }))
            .filter((d) => d.key)
        : [];

      return { ok: true as const, decisoes };
    } catch (e) {
      console.error("evaluateConsultaBlock exception:", e);
      return { ok: false as const, decisoes: [] };
    }
  });
