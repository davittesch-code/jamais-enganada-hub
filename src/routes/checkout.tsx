import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Heart,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initializePaddle, getPaddlePriceId, getPaddleEnvironment } from "@/lib/paddle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { checkEmailStatus, resendInviteEmail } from "@/lib/checkout-helpers.functions";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Garantir meu acesso — Jamais Enganada" },
      {
        name: "description",
        content:
          "Acesso completo à plataforma Jamais Enganada: perfil jurídico, 17 consultas com IA e plano de ação personalizado.",
      },
    ],
  }),
  component: CheckoutPage,
});

type AdvogadaOpt = { id: string; nome: string; oab: string | null; especialidade: string | null };

function CheckoutPage() {
  const [advogadas, setAdvogadas] = useState<AdvogadaOpt[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [confEmail, setConfEmail] = useState("");
  const [advId, setAdvId] = useState<string>("");
  const [loadingPay, setLoadingPay] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ email: string } | null>(null);
  const checkEmailStatusFn = useServerFn(checkEmailStatus);


  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("list_advogadas_publicas");
      if (data) setAdvogadas(data as AdvogadaOpt[]);
    })();
    void initializePaddle().catch((e) => console.error("Paddle init falhou", e));

    // Se o Paddle redirecionou via successUrl, recuperamos o email salvo e
    // mostramos a tela de sucesso (o eventCallback se perde no reload).
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("status") === "sucesso") {
        const savedEmail = sessionStorage.getItem("checkout:lastEmail") ?? "";
        setSucesso({ email: savedEmail });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const validar = () => {
    if (!nome.trim()) return "Informe seu nome completo.";
    if (!email.trim()) return "Informe seu email.";
    if (email.trim().toLowerCase() !== confEmail.trim().toLowerCase())
      return "Os emails não coincidem.";
    return null;
  };

  const abrirCheckout = async () => {
    setErro(null);
    const v = validar();
    if (v) {
      setErro(v);
      return;
    }
    setLoadingPay(true);
    try {
      const emailLimpo = email.trim().toLowerCase();

      // Bloqueio: se o email j\u00e1 tem acesso ativo, manda fazer login.
      const status = await checkEmailStatusFn({ data: { email: emailLimpo } });
      if (status.status === "active") {
        setErro(
          "Este email j\u00e1 tem acesso ativo \u00e0 plataforma. Fa\u00e7a login para continuar \u2014 se esqueceu a senha, clique em 'N\u00e3o recebi meu email' abaixo.",
        );
        setLoadingPay(false);
        return;
      }

      try { sessionStorage.setItem("checkout:lastEmail", emailLimpo); } catch { /* ignore */ }
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId("acesso_jamais_enganada");
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: { email: emailLimpo },
        customData: {
          nome: nome.trim(),
          email: emailLimpo,
          advogada_id: advId || null,
          tipo_produto: "acesso",
        },
        settings: {
          displayMode: "overlay",
          locale: "pt-BR",
          successUrl: `${window.location.origin}/checkout?status=sucesso`,
          allowLogout: false,
          variant: "one-page",
          // Remove PayPal — não é usado no Brasil. Pix e Boleto aparecem
          // automaticamente para clientes em BR com preço em BRL.
          allowedPaymentMethods: [
            "card",
            "apple_pay",
            "google_pay",
desconto: undefined,
          ].filter((v): v is string => typeof v === "string") as any,
        },
        eventCallback: (event: any) => {
          if (event?.name === "checkout.completed") {
            setSucesso({ email: emailLimpo });
          }
        },
      });
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível abrir o checkout.");
    } finally {
      setLoadingPay(false);
    }
  };


  if (sucesso) return <SucessoView email={sucesso.email} />;

  return (
    <div className="min-h-screen bg-white">
      <PaymentTestModeBanner />

      {/* Hero */}
      <section
        className="px-6 py-16 md:py-24"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur text-xs font-medium mb-6">
            💜 Mais de 1.000 mulheres já se protegeram
          </span>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
            Você merece saber exatamente
            <br />
            quais são os seus direitos.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Antes de tomar qualquer decisão importante, descubra o que a lei garante
            para você — em uma conversa simples, sem juridiquês, no seu tempo.
          </p>
        </div>
      </section>

      {/* Perguntas reflexivas */}
      <section className="px-6 py-16 -mt-10">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-[#6B0F4B] text-center mb-6">
            Antes de continuar, pergunte a si mesma:
          </h2>
          <ul className="space-y-4">
            {[
              "Você sabe exatamente o que é seu por direito?",
              "Tem medo de sair de um relacionamento sem nada?",
              "Conhece seus direitos sobre bens, herança e pensão?",
              "Sabe como se proteger antes de tomar uma decisão?",
            ].map((q) => (
              <li key={q} className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 mt-0.5 shrink-0 text-[#A8006E]" />
                <span className="text-gray-700">{q}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-gray-600 italic">
            Se você respondeu "não" a alguma delas, esta plataforma foi feita para você.
          </p>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-6 py-16 bg-[#FDF6F9]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center text-[#6B0F4B] mb-12">
            O que você vai ter acesso
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              "Perfil jurídico completo e personalizado",
              "Até 17 consultas jurídicas com nossa IA",
              "Análise de todas as áreas: família, bens, herança, empresa",
              "Pontos de atenção e seus direitos em cada situação",
              "Plano de ação prático e personalizado",
              "Contato direto com uma advogada parceira",
              "Acesso por 1 ano completo",
            ].map((b) => (
              <div
                key={b}
                className="bg-white rounded-xl p-5 flex gap-3 items-start shadow-sm border border-gray-100"
              >
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-[#A8006E]" />
                <span className="text-sm text-gray-700">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checkout */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl shadow-2xl border-2 border-[#A8006E]/20 overflow-hidden"
            style={{ background: "white" }}
          >
            <div
              className="px-8 py-6 text-white text-center"
              style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
            >
              <h2 className="font-display text-2xl md:text-3xl font-semibold">
                Acesso Completo Jamais Enganada
              </h2>
              <p className="text-white/85 text-sm mt-1">Pagamento único · Acesso por 1 ano</p>
            </div>

            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl md:text-6xl font-bold text-[#6B0F4B] font-display">
                  3x R$ 32,67
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  ou <strong>R$ 97,90</strong> à vista no Pix ou boleto
                </p>
                <span className="inline-block mt-3 text-xs font-semibold bg-[#FDF6F9] text-[#A8006E] px-3 py-1 rounded-full">
                  ✓ Pagamento único · Sem mensalidade
                </span>
              </div>

              <ul className="space-y-2 mb-6 text-sm text-gray-700">
                {[
                  "Perfil jurídico completo",
                  "17 consultas com IA",
                  "Plano de ação personalizado",
                  "Acesso por 1 ano",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#0F7B5A]" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    Nome completo*
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Email*</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    Confirmar email*
                  </label>
                  <input
                    type="email"
                    required
                    value={confEmail}
                    onChange={(e) => setConfEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    Tem uma advogada de preferência? (opcional)
                  </label>
                  <select
                    value={advId}
                    onChange={(e) => setAdvId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E] bg-white"
                  >
                    <option value="">Escolher depois</option>
                    {advogadas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                        {a.especialidade ? ` — ${a.especialidade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {erro && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">
                  {erro}
                </div>
              )}

              <button
                onClick={abrirCheckout}
                disabled={loadingPay}
                className="mt-6 w-full text-white font-semibold py-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-lg shadow-lg"
                style={{ backgroundColor: "#A8006E" }}
              >
                {loadingPay ? "Abrindo checkout…" : "Pagar e criar minha conta →"}
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                Após o pagamento você receberá um email para criar sua senha.
              </p>
            </div>
          </div>

          {/* Selos */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <Lock className="w-5 h-5 text-[#A8006E]" />
              Pagamento 100% seguro
            </div>
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <CreditCard className="w-5 h-5 text-[#A8006E]" />
              Pix, cartão ou boleto
            </div>
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <RotateCcw className="w-5 h-5 text-[#A8006E]" />
              Garantia de 7 dias
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4">
            🔒 Seus dados são protegidos e confidenciais.
          </p>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="px-6 py-16 bg-[#FDF6F9]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-center text-[#6B0F4B] mb-12">
            Mulheres que já se protegeram
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { nome: "Mariana, 38 anos", txt: "Eu não sabia nada sobre os meus direitos. Hoje sei exatamente o que é meu — e isso me deu paz." },
              { nome: "Carla, 45 anos", txt: "Conversar com a IA foi acolhedor, sem julgamento. Saí com um plano claro do que fazer." },
              { nome: "Patrícia, 52 anos", txt: "Descobri direitos sobre herança que eu nem imaginava. Vale cada centavo." },
            ].map((d) => (
              <div key={d.nome} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Heart className="w-5 h-5 text-[#A8006E] mb-3" />
                <p className="text-sm text-gray-700 italic mb-3">"{d.txt}"</p>
                <p className="text-xs font-semibold text-[#6B0F4B]">— {d.nome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-gray-100 text-center text-sm text-gray-500">
        <Link to="/" className="hover:text-[#A8006E]">Voltar ao início</Link>
        <span className="mx-2">·</span>
        <Link to="/login" className="hover:text-[#A8006E]">Já tenho acesso</Link>
      </footer>
    </div>
  );
}

function SucessoView({ email }: { email: string }) {
  const resendFn = useServerFn(resendInviteEmail);
  const [reenviado, setReenviado] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const reenviar = async () => {
    setReenviando(true);
    try {
      await resendFn({ data: { email } });
      setReenviado(true);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md text-center">
        <div className="text-5xl mb-4">💜</div>
        <h1 className="font-display text-2xl font-semibold text-[#6B0F4B] mb-3">
          Pagamento confirmado!
        </h1>
        <p className="text-gray-700 leading-relaxed mb-6">
          Enviamos um email para <strong>{email}</strong> com o link para você criar
          sua senha e começar. Verifique sua caixa de entrada (e o spam, por garantia).
        </p>
        <Link
          to="/"
          className="inline-block text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90"
          style={{ backgroundColor: "#A8006E" }}
        >
          Voltar ao início
        </Link>
        <div className="mt-6 pt-6 border-t border-gray-100">
          {reenviado ? (
            <p className="text-sm text-[#0F7B5A]">
              ✓ Reenviamos o email. Confira sua caixa em alguns minutos.
            </p>
          ) : (
            <button
              onClick={reenviar}
              disabled={reenviando}
              className="text-sm text-[#6B0F4B] underline hover:opacity-80 disabled:opacity-50"
            >
              {reenviando ? "Reenviando…" : "Não recebi meu email"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

