import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateProfile } from "./profile.functions";
import { evaluateConsultaBlock } from "./consulta-ai.functions";
import {
  loadProgresso,
  markProgressoConcluido,
  saveProgresso,
} from "./progresso";

// ============ BLOCOS TEMÁTICOS ============
// Agrupam perguntas para uma única avaliação da IA por bloco (eficiente).
const BLOCKS: Array<{ id: string; keys: string[] }> = [
  { id: "relacionamento", keys: ["situacao_relacionamento_detalhe", "regime_bens"] },
  { id: "filhos", keys: ["filhos_idades", "guarda_situacao"] },
  { id: "violencia", keys: ["violencia", "violencia_diagnostico"] },
  { id: "patrimonio", keys: ["imoveis"] },
  { id: "financeiro", keys: ["financeiro_situacao", "faixa_renda", "profissao", "dividas"] },
  { id: "empresa", keys: ["empresa_situacao", "empresa_nome", "trabalhou_empresa"] },
  { id: "heranca", keys: ["heranca"] },
  { id: "fechamento", keys: ["rede_apoio", "situacao_livre"] },
];
const KEY_TO_BLOCK: Record<string, string> = BLOCKS.reduce((acc, b) => {
  for (const k of b.keys) acc[k] = b.id;
  return acc;
}, {} as Record<string, string>);

type BlockDecision = {
  acao: "perguntar" | "pular" | "adaptar";
  motivo: string;
  pergunta_adaptada: string;
  confirmacao: string;
};

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

type CombinedData = OnboardingCtx & Record<string, string | undefined>;

type ConsultaQuestion = {
  key: string;
  text: string;
  options?: string[];
  multiSelect?: boolean;
  explicacao?: string;
  naoSeiLabel?: string;
  condicional?: (data: CombinedData) => boolean;
};

const LOADING_STEPS = [
  "Analisando seus dados...",
  "Cruzando com a legislação...",
  "Identificando pontos de atenção...",
  "Finalizando seu perfil...",
];

function calcTypingDelay(texto: string): number {
  const base = 800;
  const porCaractere = texto.length * 30;
  const jitter = Math.random() * 400;
  return Math.min(Math.max(base + porCaractere + jitter, 1500), 4500);
}

function calcPauseDelay(): number {
  return 1000 + Math.random() * 800;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============ PERGUNTAS DA CONSULTA ============
const CONSULTA_QUESTIONS: ConsultaQuestion[] = [
  {
    key: "situacao_relacionamento_detalhe",
    text: "Como está a situação do seu relacionamento hoje?",
    options: [
      "Estamos bem, mas quero me proteger",
      "Estamos com problemas sérios",
      "Estou planejando me separar",
      "Já estou separada / em processo",
      "Estou em situação de risco",
    ],
    naoSeiLabel: "Prefiro não responder agora",
    explicacao:
      "Esta pergunta nos ajuda a entender a urgência da sua situação e quais direitos são mais importantes proteger agora.",
  },
  {
    key: "regime_bens",
    text: "Qual é o regime de bens do seu casamento ou união estável?",
    options: [
      "Comunhão Parcial de Bens",
      "Comunhão Universal de Bens",
      "Separação Total de Bens",
      "Separação Obrigatória (por lei)",
      "Participação Final nos Aquestos",
    ],
    naoSeiLabel: "Não sei qual é o regime",
    explicacao:
      "O regime de bens define como o patrimônio é dividido entre o casal. Se você casou sem assinar nada em cartório, provavelmente é Comunhão Parcial — o mais comum no Brasil. Na união estável, também é Comunhão Parcial por padrão. Isso impacta diretamente o que você tem direito em caso de separação.",
    condicional: (d) =>
      ["casada", "união estável", "uniao estavel", "separada", "divorciada"].some(
        (s) => (d.estado_civil ?? "").toLowerCase().includes(s),
      ),
  },
  {
    key: "filhos_idades",
    text: "Qual a idade dos seus filhos?",
    options: [
      "Todos menores de 18 anos",
      "Alguns menores, alguns maiores",
      "Todos maiores de 18 anos",
      "Tenho filhos com necessidades especiais (qualquer idade)",
    ],
    naoSeiLabel: "Prefiro não informar",
    explicacao:
      "A idade dos filhos é fundamental: guarda e pensão alimentícia se aplicam apenas a filhos menores de 18 anos (ou até 24 anos se ainda estudarem e dependerem financeiramente). Para filhos maiores e independentes, não há guarda nem pensão entre os pais.",
    condicional: (d) => (d.tem_filhos ?? "").toLowerCase().includes("sim"),
  },
  {
    key: "guarda_situacao",
    text: "Como está a situação de guarda e pensão dos seus filhos?",
    options: [
      "Não há acordo — precisamos definir",
      "Temos acordo informal",
      "Temos acordo em papel / homologado",
      "Está na Justiça",
      "Pai não paga / não cumpre acordo",
    ],
    naoSeiLabel: "Não sei como funciona",
    explicacao:
      "Guarda compartilhada é a regra desde 2014 — significa que ambos os pais têm autoridade igual sobre decisões importantes, mesmo que a criança more com um deles. Pensão alimentícia é calculada pelo trinômio: necessidade do filho + possibilidade do pai + proporcionalidade.",
    condicional: (d) =>
      !!d.filhos_idades && !d.filhos_idades.includes("Todos maiores"),
  },
  {
    key: "violencia",
    text: "Existe ou já existiu alguma situação de violência no seu relacionamento?",
    options: [
      "Não, nunca",
      "Sim — violência física",
      "Sim — violência psicológica ou moral",
      "Sim — violência financeira ou patrimonial",
      "Sim — mais de um tipo",
      "Já existiu, mas passou",
    ],
    naoSeiLabel: "Não sei se o que vivo é violência",
    explicacao:
      "Violência não é só física. A Lei Maria da Penha reconhece 5 tipos: física, psicológica, sexual, patrimonial e moral. Violência patrimonial inclui: controlar seu dinheiro, impedir que você trabalhe, não te dar acesso a contas, destruir seus bens, colocar dívidas no seu nome sem sua aprovação.",
  },
  {
    key: "violencia_diagnostico",
    text: "Vou te fazer algumas perguntas rápidas para te ajudar a entender melhor. Selecione as que se aplicam à sua situação:",
    multiSelect: true,
    options: [
      "Não tenho acesso livre às contas bancárias do casal",
      "Ele controla quanto dinheiro eu posso gastar",
      "Já me impediu de trabalhar ou estudar",
      "Tomo decisões com medo da reação dele",
      "Ele me humilha ou diminui na frente de outros",
      "Já destruiu objetos meus ou ameaçou fazer isso",
      'Me sinto "vigiada" ou controlada',
      "Nenhuma das anteriores",
    ],
    explicacao:
      "Se você marcou qualquer item acima (exceto o último), pode estar vivenciando alguma forma de violência doméstica. Isso não é culpa sua e existem direitos e mecanismos legais para te proteger.",
    condicional: (d) => d.violencia === "Não sei se o que vivo é violência",
  },
  {
    key: "imoveis",
    text: "Você tem imóveis? Selecione tudo que se aplica:",
    multiSelect: true,
    options: [
      "Não tenho imóveis",
      "Imóvel só no meu nome",
      "Imóvel só no nome dele",
      "Imóvel nos dois nomes",
      "Financiamento no meu nome",
      "Financiamento no nome dele",
      "Financiamento nos dois nomes",
      "Imóvel herdado (meu)",
      "Imóvel herdado (dele)",
    ],
    naoSeiLabel: "Não sei como está registrado",
    explicacao:
      "O nome na escritura não é tudo. No regime de Comunhão Parcial, bens adquiridos durante o casamento são de ambos — mesmo que estejam só no nome dele. Imóveis herdados ou recebidos de doação são em geral bens particulares e ficam fora da partilha.",
  },
  {
    key: "financeiro_situacao",
    text: "Como é sua situação financeira atual?",
    options: [
      "Tenho renda própria estável",
      "Tenho renda própria mas irregular",
      "Dependo financeiramente do meu parceiro",
      "Estou desempregada no momento",
      "Tenho renda mas ele controla tudo",
    ],
    naoSeiLabel: "Prefiro não informar",
    explicacao:
      "Sua independência financeira impacta diretamente o direito a alimentos. Se você ficou sem renda por cuidar da família ou da casa durante o casamento, pode ter direito a alimentos compensatórios — uma renda paga pelo ex-cônjuge para reequilibrar a situação econômica.",
  },
  {
    key: "faixa_renda",
    text: "Qual é a sua faixa de renda mensal?",
    options: [
      "Sem renda própria",
      "Até R$ 2.500",
      "R$ 2.500 a R$ 5.000",
      "R$ 5.000 a R$ 10.000",
      "Acima de R$ 10.000",
    ],
    naoSeiLabel: "Prefiro não informar",
    explicacao:
      "A faixa de renda é usada para avaliar vulnerabilidade financeira e o direito a alimentos. Não usamos esse dado para nenhuma outra finalidade.",
  },
  {
    key: "profissao",
    text: "Qual é a sua situação profissional?",
    options: [
      "Empregada com carteira assinada (CLT)",
      "Servidora pública / concursada",
      "Autônoma / freelancer",
      "Empresária / sócia de empresa",
      "Do lar (sem renda própria)",
      "Desempregada buscando trabalho",
      "Aposentada / pensionista",
    ],
    naoSeiLabel: "Outra situação",
    explicacao:
      "Sua situação profissional impacta direitos trabalhistas, INSS, licenças e como a Justiça avalia sua capacidade financeira em casos de alimentos.",
  },
  {
    key: "dividas",
    text: "Você tem dívidas? Selecione tudo que se aplica:",
    multiSelect: true,
    options: [
      "Não tenho dívidas",
      "Dívidas pessoais (cartão, empréstimo)",
      "Dívidas do casal — ambos sabem",
      "Dívidas que ele fez sem me avisar",
      "Financiamento imobiliário",
      "Financiamento de veículo",
      "Dívidas empresariais",
    ],
    naoSeiLabel: "Não sei se temos dívidas em comum",
    explicacao:
      "Dívidas feitas durante o casamento para benefício da família são em geral de ambos, mesmo que só um assinou. Mas dívidas pessoais feitas por um cônjuge sem o outro saber costumam ser responsabilidade só de quem as fez.",
  },
  {
    key: "empresa_situacao",
    text: "Você tem ou já teve empresa ou atividade como autônoma?",
    options: [
      "Sim, tenho empresa ativa",
      "Sim, mas encerrei",
      "Sou MEI ou autônoma",
      "Nunca tive",
    ],
    naoSeiLabel: "Não sei se minha atividade conta como empresa",
    explicacao:
      "MEI, ME, LTDA, autônoma com CNPJ — todas são formas de empresa. Mesmo sem CNPJ, se você presta serviços e recebe por isso, tem direitos e obrigações como profissional autônoma.",
  },
  {
    key: "empresa_nome",
    text: "A empresa está registrada em qual nome?",
    options: [
      "Só no meu nome",
      "Só no nome dele",
      "Nos dois nomes (sócios)",
      "Em nome de terceiros mas é nossa",
    ],
    naoSeiLabel: "Não sei como está registrada",
    explicacao:
      "O nome no contrato social não é tudo. Se a empresa foi constituída durante o casamento em Comunhão Parcial, os bens e lucros da empresa podem ser partilháveis — mesmo que só ele figure como sócio.",
    condicional: (d) =>
      !!d.empresa_situacao && !d.empresa_situacao.includes("Nunca tive"),
  },
  {
    key: "trabalhou_empresa",
    text: "Você trabalhou ou trabalha na empresa dele (mesmo sem ser sócia)?",
    options: [
      "Sim, trabalhei e recebi salário",
      "Sim, trabalhei mas nunca recebi",
      "Ajudei informalmente às vezes",
      "Não, nunca trabalhei na empresa dele",
    ],
    naoSeiLabel: "Não tenho certeza se o que fiz conta como trabalho",
    explicacao:
      "Se você trabalhou na empresa do seu parceiro sem receber, pode ter direito a salários atrasados e, dependendo do regime de bens e da sua contribuição, até participação nos lucros ou no valor da empresa. Isso é frequentemente ignorado e pode representar valores significativos.",
    condicional: (d) =>
      !!d.empresa_nome &&
      (d.empresa_nome.includes("nome dele") ||
        d.empresa_nome.includes("Nos dois nomes")),
  },
  {
    key: "heranca",
    text: "Você tem ou espera receber herança? Selecione o que se aplica:",
    multiSelect: true,
    options: [
      "Não tenho essa preocupação",
      "Já recebi herança durante o casamento",
      "Há processo de inventário em andamento",
      "Tenho pais ou familiares com patrimônio",
      "Recebi doação de bens durante o casamento",
      "Estou em disputa de herança",
    ],
    naoSeiLabel: "Não sei se tenho direitos de herança",
    explicacao:
      "Herança e doação recebidas durante o casamento são em geral bens particulares — ficam fora da partilha com o cônjuge (exceto em Comunhão Universal). Mas os rendimentos gerados por esses bens durante o casamento podem ser partilháveis. Seu cônjuge também pode ser seu herdeiro, dependendo do regime de bens.",
  },
  {
    key: "rede_apoio",
    text: "Você tem rede de apoio disponível neste momento?",
    multiSelect: true,
    options: [
      "Família próxima e de confiança",
      "Amigas / amigos de confiança",
      "Suporte psicológico ou terapia",
      "Apoio religioso / espiritual",
      "Não tenho rede de apoio no momento",
    ],
    naoSeiLabel: "Não sei se posso contar com alguém",
    explicacao:
      "Ter rede de apoio é fundamental em momentos de mudança. Não precisa enfrentar isso sozinha. Se precisar, existem serviços gratuitos de apoio psicológico e jurídico para mulheres em situação de vulnerabilidade.",
  },
  {
    key: "situacao_livre",
    text: "Para fechar, me conta livremente: existe algo que não perguntei mas que você considera importante para o seu perfil? Pode ser um medo, uma dúvida, uma situação específica.",
    explicacao:
      "Cada história é única. Esta é a sua chance de compartilhar o que não coube nas perguntas anteriores. Quanto mais você contar, mais completo e útil será o seu perfil.",
  },
];

function filterQuestions(data: CombinedData): ConsultaQuestion[] {
  return CONSULTA_QUESTIONS.filter((q) => !q.condicional || q.condicional(data));
}

// Mensagem empática quando a usuária responde "Não sei"
function naoSeiResponse(key: string, label: string, nome?: string): string {
  const hints: Record<string, string> = {
    regime_bens:
      "Você pode descobrir isso na sua certidão de casamento ou indo ao cartório onde casou.",
    imoveis:
      "Os contratos, escrituras e matrículas dos imóveis ajudam a esclarecer essa parte.",
    dividas:
      "Um extrato do Serasa ou do Registrato (Banco Central) mostra dívidas no seu CPF.",
    empresa_nome:
      "O contrato social da empresa ou uma consulta na Junta Comercial revela quem são os sócios.",
    filhos_idades: "Pode me responder depois quando preferir.",
    violencia:
      "Vamos investigar isso juntas com algumas perguntas rápidas a seguir.",
    heranca:
      "Conversar com a família ou consultar inventários abertos pode esclarecer.",
  };
  const hint = hints[key] ?? "Anote para descobrir com calma — talvez com seu advogado ou nos seus documentos.";
  const prefixo = nome ? `${nome}, ` : "";
  return `${prefixo}tudo bem não saber agora. ${hint} Vou seguir construindo seu perfil com o que você já me contou. 💜`;
}

type Answers = Record<string, string>;

export function useConsulta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const callGenerate = useServerFn(generateProfile);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOptions, setCurrentOptions] = useState<string[] | null>(null);
  const [currentMultiSelect, setCurrentMultiSelect] = useState<boolean>(false);
  const [currentExplicacao, setCurrentExplicacao] = useState<string | undefined>(undefined);
  const [currentNaoSeiLabel, setCurrentNaoSeiLabel] = useState<string | undefined>(undefined);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [erroGeracao, setErroGeracao] = useState(false);

  // Estado C: tela de entrada para quem já tem profile_data e nenhum progresso ativo
  const [entradaModo, setEntradaModo] = useState(false);
  const [perfilGeracoesUsed, setPerfilGeracoesUsed] = useState(0);
  const [perfilGeracoesLimit, setPerfilGeracoesLimit] = useState(2);
  const [nomeUsuaria, setNomeUsuaria] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [showUpsellPerfil, setShowUpsellPerfil] = useState(false);

  const ctxRef = useRef<OnboardingCtx>({});
  const answersRef = useRef<Answers>({});
  const respostasRef = useRef<{ question: string; answer: string }[]>([]);
  const askedKeysRef = useRef<Set<string>>(new Set());
  const dadosFaltantesRef = useRef<Set<string>>(new Set());
  const currentKeyRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);
  const checkedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const callEvaluateBlock = useServerFn(evaluateConsultaBlock);

  const blockDecisionsRef = useRef<Map<string, BlockDecision>>(new Map());
  const evaluatedBlocksRef = useRef<Set<string>>(new Set());
  const proceedNextRef = useRef<() => void | Promise<void>>(() => {});
  const messagesRef = useRef<Message[]>([]);
  const concluidoRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  const addMessage = useCallback((sender: Sender, text: string) => {
    setMessages((prev) => [...prev, { id: uid(), sender, text, timestamp: new Date() }]);
  }, []);

  // Debounced save do progresso da consulta (~500ms).
  const scheduleSave = useCallback(() => {
    if (!user || concluidoRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        const contexto = {
          ctx: ctxRef.current,
          answers: answersRef.current,
          respostas: respostasRef.current,
          askedKeys: Array.from(askedKeysRef.current),
          dadosFaltantes: Array.from(dadosFaltantesRef.current),
          currentKey: currentKeyRef.current,
          evaluatedBlocks: Array.from(evaluatedBlocksRef.current),
          blockDecisions: Object.fromEntries(blockDecisionsRef.current),
        };
        await saveProgresso({
          userId: user.id,
          etapa: "consulta",
          mensagens: messagesRef.current,
          contexto,
          indiceAtual: respostasRef.current.length,
        });
        setSavedFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2000);
      })();
    }, 500);
  }, [user]);

  // Sincroniza messagesRef e dispara save sempre que as mensagens mudam.
  useEffect(() => {
    messagesRef.current = messages;
    if (hasStartedRef.current && messages.length > 0) scheduleSave();
  }, [messages, scheduleSave]);

  const getCombined = useCallback((): CombinedData => {
    return { ...ctxRef.current, ...answersRef.current };
  }, []);

  const pickNextQuestion = useCallback((): ConsultaQuestion | null => {
    const list = filterQuestions(getCombined());
    for (const q of list) {
      if (!askedKeysRef.current.has(q.key)) return q;
    }
    return null;
  }, [getCombined]);

  const askQuestion = useCallback(
    (q: ConsultaQuestion, overrideText?: string) => {
      const text = (overrideText && overrideText.trim()) || q.text;
      setIsTyping(true);
      setCurrentOptions(null);
      setCurrentExplicacao(undefined);
      setCurrentNaoSeiLabel(undefined);
      setCurrentMultiSelect(false);
      askedKeysRef.current.add(q.key);
      currentKeyRef.current = q.key;
      schedule(() => {
        setIsTyping(false);
        addMessage("sofia", text);
        const totalVisible = filterQuestions(getCombined()).length;
        const answered = Object.keys(answersRef.current).length;
        setProgress(Math.min(90, Math.round((answered / Math.max(totalVisible, 1)) * 90)));
        setCurrentExplicacao(q.explicacao);
        setCurrentNaoSeiLabel(q.naoSeiLabel);
        if (q.options && q.options.length > 0) {
          setCurrentOptions(q.options);
          setCurrentMultiSelect(!!q.multiSelect);
        } else {
          setCurrentOptions(null);
          setCurrentMultiSelect(false);
        }
        setInputDisabled(false);
      }, calcTypingDelay(text));
    },
    [addMessage, getCombined, schedule],
  );

  const finalize = useCallback(async () => {
    setInputDisabled(true);
    setCurrentOptions(null);
    setErroGeracao(false);
    setIsGenerating(true);
    setProgress(95);

    // Inclui meta-entrada com dados faltantes para o gerador
    const respostas = [...respostasRef.current];
    if (dadosFaltantesRef.current.size > 0) {
      respostas.push({
        question: "[META] Áreas em que a usuária NÃO soube responder (dados_faltantes)",
        answer:
          "Para estas áreas, NÃO deixe vazio nem marque 'não aplicável'. Use status 'atencao', explique no resumo o que ela precisa descobrir, cite a lei aplicável e gere next_step concreto ('Descubra [info] fazendo [ação concreta]'). Áreas: " +
          Array.from(dadosFaltantesRef.current).join(", "),
      });
    }

    let res: Awaited<ReturnType<typeof callGenerate>> | null = null;
    try {
      res = await callGenerate({
        data: {
          onboarding: ctxRef.current as Record<string, string>,
          respostas,
        },
      });
    } catch (e) {
      console.error("generateProfile call failed", e);
      setErroGeracao(true);
      return;
    }

    if (!res || !res.ok || !res.profile) {
      setErroGeracao(true);
      return;
    }
    if (!user) {
      setErroGeracao(true);
      return;
    }

    const p = res.profile as Record<string, unknown>;
    const { error: upsertError } = await supabase.from("profile_data").upsert(
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
          dados_faltantes: Array.from(dadosFaltantesRef.current),
          perguntas_sugeridas: (p.perguntas_sugeridas as Record<string, string[]>) ?? {},
        } as never,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      console.error("Erro ao salvar no Supabase:", upsertError);
      setErroGeracao(true);
      return;
    }

    try {
      const { data: atual } = await supabase
        .from("profiles")
        .select("perfil_generations_used")
        .eq("id", user.id)
        .single();
      const novoValor = (atual?.perfil_generations_used ?? 0) + 1;
      await supabase
        .from("profiles")
        .update({ perfil_generations_used: novoValor })
        .eq("id", user.id);
    } catch (e) {
      console.error("Falha ao incrementar perfil_generations_used", e);
    }

    // Marca progresso da consulta como concluído
    concluidoRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    try {
      await markProgressoConcluido(user.id, "consulta");
    } catch (e) {
      console.error("mark consulta concluido failed", e);
    }

    setProgress(100);
    navigate({ to: "/perfil" });
  }, [callGenerate, navigate, user]);

  const retryGerar = useCallback(() => {
    setErroGeracao(false);
    void finalize();
  }, [finalize]);

  const proceedNext = useCallback(async () => {
    const next = pickNextQuestion();
    if (!next) {
      const nome = ctxRef.current.nome ?? "amiga";
      const msg1 = `Obrigada por compartilhar tudo isso comigo, ${nome}. Agora vou analisar cada resposta com cuidado e preparar o seu perfil jurídico.`;
      const msg2 =
        "Isso pode levar alguns segundos... Já já você terá um panorama completo dos seus direitos e dos pontos que merecem atenção. 🔍";
      schedule(() => {
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          addMessage("sofia", msg1);
          schedule(() => {
            setIsTyping(true);
            schedule(() => {
              setIsTyping(false);
              addMessage("sofia", msg2);
              schedule(() => void finalize(), 1500);
            }, calcTypingDelay(msg2));
          }, calcPauseDelay());
        }, calcTypingDelay(msg1));
      }, calcPauseDelay());
      return;
    }

    // Avaliação inteligente: antes de exibir a primeira pergunta do bloco,
    // chamamos a IA UMA vez com o contexto completo para decidir, para cada
    // pergunta do bloco, se devemos perguntar / pular / adaptar.
    const blockId = KEY_TO_BLOCK[next.key];
    if (blockId && !evaluatedBlocksRef.current.has(blockId)) {
      evaluatedBlocksRef.current.add(blockId);
      const blockKeys = BLOCKS.find((b) => b.id === blockId)?.keys ?? [];
      const ctx = getCombined();
      const pendingQs = blockKeys
        .map((k) => CONSULTA_QUESTIONS.find((q) => q.key === k))
        .filter(
          (q): q is ConsultaQuestion =>
            !!q &&
            !askedKeysRef.current.has(q.key) &&
            (!q.condicional || q.condicional(ctx)),
        );
      if (pendingQs.length > 0) {
        // Mostra typing enquanto a IA decide (mantém UX viva)
        setIsTyping(true);
        try {
          const sanitizedCtx: Record<string, string> = {};
          for (const [k, v] of Object.entries(ctx)) {
            if (typeof v === "string" && v.length > 0) sanitizedCtx[k] = v;
          }
          const result = await callEvaluateBlock({
            data: {
              contexto: sanitizedCtx,
              perguntas: pendingQs.map((q) => ({ key: q.key, text: q.text })),
            },
          });
          if (result?.ok && Array.isArray(result.decisoes)) {
            for (const d of result.decisoes) {
              blockDecisionsRef.current.set(d.key, d as BlockDecision);
            }
          }
        } catch (e) {
          console.error("evaluateConsultaBlock call failed", e);
        }
        setIsTyping(false);
      }
    }

    const decision = blockDecisionsRef.current.get(next.key);

    if (decision?.acao === "pular") {
      askedKeysRef.current.add(next.key);
      const motivo = decision.motivo?.trim() || "já informado pelo contexto";
      // Marca como inferido: não conta no limite (não persistimos em onboarding_responses)
      // mas mantemos no contexto para o gerador de perfil entender.
      answersRef.current[next.key] = `[Inferido] ${motivo}`;
      respostasRef.current.push({
        question: next.text,
        answer: `[Inferido do contexto] ${motivo}`,
      });
      const conf =
        decision.confirmacao?.trim() ||
        "Já tenho essa informação pelo que você me contou. Vou seguir. 💜";
      setIsTyping(true);
      schedule(() => {
        setIsTyping(false);
        addMessage("sofia", conf);
        schedule(() => void proceedNextRef.current(), calcPauseDelay());
      }, calcTypingDelay(conf));
      return;
    }

    const overrideText =
      decision?.acao === "adaptar" ? decision.pergunta_adaptada : undefined;
    schedule(() => askQuestion(next, overrideText), calcPauseDelay());
  }, [addMessage, askQuestion, callEvaluateBlock, finalize, getCombined, pickNextQuestion, schedule]);

  // Mantém um ref atualizado para permitir recursão de proceedNext.
  proceedNextRef.current = proceedNext;

  const persistResposta = useCallback(
    async (question: string, answer: string) => {
      if (!user) return;
      try {
        await supabase.from("onboarding_responses").insert({
          user_id: user.id,
          step: "consulta",
          question,
          answer,
        });
      } catch (e) {
        console.error("supabase insert failed", e);
      }
    },
    [user],
  );

  const handleReply = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const key = currentKeyRef.current;

      // Aguardando "vamos começar"
      if (key === "__start__") {
        addMessage("user", trimmed);
        setCurrentOptions(null);
        setInputDisabled(true);
        const next = pickNextQuestion();
        if (next) schedule(() => askQuestion(next), 600);
        return;
      }

      if (!key || inputDisabled) return;
      const q = CONSULTA_QUESTIONS.find((x) => x.key === key);
      if (!q) return;

      setInputDisabled(true);
      setCurrentOptions(null);
      setCurrentMultiSelect(false);
      addMessage("user", trimmed);

      // Detecta resposta "Não sei"
      const isNaoSei = q.naoSeiLabel && trimmed === q.naoSeiLabel;
      if (isNaoSei && q.naoSeiLabel) {
        answersRef.current[key] = q.naoSeiLabel;
        dadosFaltantesRef.current.add(key);
        const respostaSalva = `Não informado — ${q.naoSeiLabel}`;
        respostasRef.current.push({ question: q.text, answer: respostaSalva });
        await persistResposta(q.text, respostaSalva);

        const empathic = naoSeiResponse(key, q.naoSeiLabel, ctxRef.current.nome);
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          addMessage("sofia", empathic);
          schedule(() => proceedNext(), calcPauseDelay());
        }, calcTypingDelay(empathic));
        return;
      }

      answersRef.current[key] = trimmed;
      respostasRef.current.push({ question: q.text, answer: trimmed });
      await persistResposta(q.text, trimmed);

      // Acolhimento extra para violência atual (qualquer "Sim —")
      if (key === "violencia" && /^Sim\s+—/i.test(trimmed)) {
        const acolhimento =
          "Sinto muito que você esteja vivendo isso. Você não está sozinha — a Lei Maria da Penha existe para te proteger, e vamos garantir que seu perfil destaque os caminhos seguros para você. 💜";
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          addMessage("sofia", acolhimento);
          schedule(() => proceedNext(), calcPauseDelay());
        }, calcTypingDelay(acolhimento));
        return;
      }

      proceedNext();
    },
    [addMessage, askQuestion, inputDisabled, persistResposta, pickNextQuestion, proceedNext, schedule],
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
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Bootstrap
  useEffect(() => {
    if (!user || hasStartedRef.current || checkedRef.current) return;
    checkedRef.current = true;

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
      } catch (e) {
        console.error("profile_data check failed", e);
      }

      // RETOMAR consulta salva (se não concluída)
      try {
        const progresso = await loadProgresso(user.id, "consulta");
        if (progresso) {
          const c = (progresso.contexto ?? {}) as {
            ctx?: OnboardingCtx;
            answers?: Answers;
            respostas?: { question: string; answer: string }[];
            askedKeys?: string[];
            dadosFaltantes?: string[];
            currentKey?: string | null;
            evaluatedBlocks?: string[];
            blockDecisions?: Record<string, BlockDecision>;
          };
          ctxRef.current = c.ctx ?? {};
          answersRef.current = c.answers ?? {};
          respostasRef.current = c.respostas ?? [];
          askedKeysRef.current = new Set(c.askedKeys ?? []);
          dadosFaltantesRef.current = new Set(c.dadosFaltantes ?? []);
          evaluatedBlocksRef.current = new Set(c.evaluatedBlocks ?? []);
          blockDecisionsRef.current = new Map(
            Object.entries(c.blockDecisions ?? {}),
          );
          // Se ela tinha uma pergunta aberta sem resposta, reapresentamos.
          const openKey = c.currentKey ?? null;
          if (openKey && !answersRef.current[openKey]) {
            askedKeysRef.current.delete(openKey);
          }

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
          hasStartedRef.current = true;

          const totalVisible = filterQuestions(getCombined()).length;
          const answered = Object.keys(answersRef.current).length;
          setProgress(
            Math.min(90, Math.round((answered / Math.max(totalVisible, 1)) * 90)),
          );

          schedule(() => {
            setIsTyping(true);
            schedule(() => {
              setIsTyping(false);
              addMessage(
                "sofia",
                "Bem-vinda de volta! Vamos continuar montando o seu perfil de onde paramos. 💜",
              );
              schedule(() => void proceedNextRef.current(), calcPauseDelay());
            }, 1200);
          }, 400);
          return;
        }
      } catch (e) {
        console.error("consulta resume from progresso failed", e);
      }

      let ctx: OnboardingCtx = {};
      try {
        const raw = localStorage.getItem("jamais_onboarding_context");
        if (raw) ctx = JSON.parse(raw);
      } catch (e) {
        console.error("localStorage parse failed", e);
      }

      // SEMPRE buscamos as respostas do onboarding do Supabase para garantir
      // que o contexto completo (incluindo respostas livres) chegue à IA.
      try {
        const { data } = await supabase
          .from("onboarding_responses")
          .select("question, answer")
          .eq("user_id", user.id)
          .eq("step", "onboarding");
        if (data) {
          const map: OnboardingCtx = { ...ctx };
          for (const r of data) {
            const q = (r.question || "").toLowerCase();
            const a = r.answer ?? undefined;
            if (!a) continue;
            if (!map.nome && q.includes("nome")) map.nome = a;
            else if (!map.idade && q.includes("anos")) map.idade = a;
            else if (!map.estado && q.includes("estado") && q.includes("mora")) map.estado = a;
            else if (!map.estado_civil && (q.includes("relacionamento") || q.includes("civil"))) map.estado_civil = a;
            else if (!map.tem_filhos && q.includes("filhos")) map.tem_filhos = a;
            else if (!map.tem_empresa && (q.includes("negócio") || q.includes("empresa") || q.includes("autônoma"))) map.tem_empresa = a;
            else if (!map.tem_bens && q.includes("bens")) map.tem_bens = a;
            else if (!map.motivacao_principal && (q.includes("preocup") || q.includes("buscar"))) map.motivacao_principal = a;
            // Sempre guardamos a resposta original também (chave = pergunta) para a IA ver tudo.
            const slug = "onb_" + (r.question || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
            if (slug && !map[slug]) map[slug] = a;
          }
          ctx = map;
        }
      } catch (e) {
        console.error("onboarding fetch failed", e);
      }

      ctxRef.current = ctx;
      hasStartedRef.current = true;

      const nome = ctx.nome ?? "amiga";

      try {
        const { data: prev } = await supabase
          .from("onboarding_responses")
          .select("question, answer, created_at")
          .eq("user_id", user.id)
          .eq("step", "consulta")
          .order("created_at", { ascending: true });
        if (prev && prev.length > 0) {
          const map = new Map<string, string>();
          for (const r of prev) {
            if (r.answer) map.set(r.question, r.answer);
          }
          respostasRef.current = Array.from(map.entries()).map(([question, answer]) => ({
            question,
            answer,
          }));

          schedule(
            () =>
              addMessage(
                "sofia",
                `${nome}, encontrei as respostas que você já tinha me dado. Não precisa preencher de novo — vou direto gerar o seu perfil. 💜`,
              ),
            600,
          );
          schedule(() => void finalize(), 2200);
          return;
        }
      } catch (e) {
        console.error("consulta resume check failed", e);
      }

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
        setCurrentMultiSelect(false);
        setCurrentExplicacao(undefined);
        setCurrentNaoSeiLabel(undefined);
        setInputDisabled(false);
        currentKeyRef.current = "__start__";
      }, 5500);
    })();
  }, [user, navigate, schedule, addMessage, finalize]);

  return {
    messages,
    isTyping,
    progress,
    currentOptions,
    currentMultiSelect,
    currentExplicacao,
    currentNaoSeiLabel,
    inputDisabled,
    isGenerating,
    loadingText: LOADING_STEPS[loadingStep],
    handleReply,
    erroGeracao,
    retryGerar,
    savedFlash,
  };
}
