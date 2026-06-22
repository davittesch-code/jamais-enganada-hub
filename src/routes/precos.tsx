import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Shield, CreditCard } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — Jamais Enganada" },
      {
        name: "description",
        content:
          "Acesso completo à plataforma Jamais Enganada por R$ 97,90. Pagamento único, sem mensalidade. Cartão em até 3x, Pix ou boleto.",
      },
    ],
  }),
  component: PrecosPage,
});

function PrecosPage() {
  return (
    <div className="min-h-screen bg-white">
      <LegalHeader />

      <section
        className="px-6 py-16 md:py-20"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center text-white">
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
            Um único investimento.
            <br />
            Para uma vida inteira de clareza.
          </h1>
          <p className="mt-5 text-lg text-white/90">
            Sem mensalidade. Sem renovação automática. Você paga uma vez e acessa
            a plataforma pelo período contratado.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10">
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-[#FCE7F3] text-[#6B0F4B] text-xs font-medium">
              Plano único
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[#6B0F4B] mt-4">
              Acesso completo
            </h2>
            <div className="mt-6">
              <div className="text-5xl font-display font-semibold text-gray-900">
                R$ 97,90
              </div>
              <p className="mt-2 text-sm text-gray-600">
                à vista no Pix ou boleto, ou <strong>3x de R$ 32,67</strong> sem juros
                no cartão de crédito
              </p>
            </div>

            <Link
              to="/checkout"
              className="mt-8 inline-flex items-center justify-center w-full px-6 py-3.5 rounded-lg bg-[#A8006E] text-white font-medium hover:bg-[#6B0F4B] transition"
            >
              Quero começar agora
            </Link>
          </div>

          <ul className="mt-10 space-y-3">
            {[
              "Tira-dúvidas inteligente com a Sofia, sua assistente jurídica",
              "Perfil jurídico personalizado em 8 áreas da sua vida",
              "Acompanhamento humano com advogada parceira",
              "Pesquisas e materiais exclusivos para mulheres",
              "Sem mensalidade — pagamento único",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-gray-700">
                <Check className="w-5 h-5 mt-0.5 shrink-0 text-[#A8006E]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-6 border-t border-gray-100 grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <CreditCard className="w-4 h-4 mt-0.5 text-[#A8006E]" />
              <span>Cartão (até 3x) ou Pix à vista</span>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-[#A8006E]" />
              <span>Garantia de reembolso de 14 dias</span>
            </div>
          </div>
        </div>

        <p className="max-w-2xl mx-auto mt-6 text-center text-xs text-gray-500">
          Pagamento processado pela Asaas (Pix e cartão). Veja os{" "}

          <Link to="/termos" className="underline">
            Termos
          </Link>
          ,{" "}
          <Link to="/privacidade" className="underline">
            Privacidade
          </Link>{" "}
          e{" "}
          <Link to="/reembolso" className="underline">
            Reembolso
          </Link>
          .
        </p>
      </section>

      <LegalFooter />
    </div>
  );
}

function LegalHeader() {
  return (
    <header className="px-6 py-5 border-b border-gray-100">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
          <Link to="/precos" className="hover:text-[#6B0F4B]">Preços</Link>
          <Link to="/termos" className="hover:text-[#6B0F4B]">Termos</Link>
          <Link to="/privacidade" className="hover:text-[#6B0F4B]">Privacidade</Link>
          <Link to="/reembolso" className="hover:text-[#6B0F4B]">Reembolso</Link>
        </nav>
      </div>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="px-6 py-10 border-t border-gray-100 text-center text-xs text-gray-500">
      <p>
        Juliana Fais Sociedade Individual de Advocacia — CNPJ 61.844.690/0001-50
      </p>
      <p className="mt-1">
        Avenida Tamandaré, 251, Sala 301 — Zona 01 — Maringá/PR — CEP 87013-210
      </p>
      <div className="mt-4 flex justify-center gap-5">
        <Link to="/termos" className="hover:text-[#6B0F4B]">Termos</Link>
        <Link to="/privacidade" className="hover:text-[#6B0F4B]">Privacidade</Link>
        <Link to="/reembolso" className="hover:text-[#6B0F4B]">Reembolso</Link>
      </div>
    </footer>
  );
}
