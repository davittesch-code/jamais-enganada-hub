import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reembolso")({
  head: () => ({
    meta: [
      { title: "Política de Reembolso — Jamais Enganada" },
      {
        name: "description",
        content:
          "Garantia de 14 dias de reembolso integral na plataforma Jamais Enganada. Saiba como solicitar.",
      },
    ],
  }),
  component: ReembolsoPage,
});

const SELLER = "Juliana Fais Sociedade Individual de Advocacia";
const CNPJ = "61.844.690/0001-50";
const ENDERECO =
  "Avenida Tamandaré, 251, Sala 301 — Zona 01 — Maringá/PR — CEP 87013-210";

function ReembolsoPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#6B0F4B]">
          Política de Reembolso
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Última atualização: 19 de junho de 2026
        </p>

        <Section title="1. Garantia de 14 dias">
          <p>
            Queremos que você se sinta segura ao contratar a plataforma{" "}
            <strong>Jamais Enganada</strong>. Por isso, oferecemos{" "}
            <strong>garantia incondicional de 14 (catorze) dias</strong>{" "}
            corridos a contar da data da compra. Se, dentro deste prazo, você
            não estiver satisfeita por qualquer motivo, basta solicitar o
            reembolso integral.
          </p>
        </Section>

        <Section title="2. Como solicitar o reembolso">
          <p>
            Nosso processo de pedidos é conduzido pelo nosso revendedor online{" "}
            <strong>Paddle.com</strong>, que atua como{" "}
            <em>Merchant of Record</em> de todas as nossas transações. Os
            reembolsos são processados por meio da Paddle.
          </p>
          <p className="mt-3">Para solicitar, você pode:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              Acessar{" "}
              <a
                href="https://paddle.net"
                target="_blank"
                rel="noreferrer"
                className="underline text-[#A8006E]"
              >
                paddle.net
              </a>{" "}
              com o e-mail utilizado na compra e solicitar o reembolso pelo
              portal da Paddle; ou
            </li>
            <li>
              Entrar em contato com nosso suporte (item 5) que encaminharemos
              sua solicitação à Paddle.
            </li>
          </ul>
        </Section>

        <Section title="3. Prazo de devolução">
          <p>
            Após aprovado o reembolso, o estorno é processado pela Paddle e o
            prazo para o crédito retornar ao seu meio de pagamento depende da
            sua instituição financeira:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Cartão de crédito:</strong> em geral, de 5 a 30 dias,
              podendo aparecer na fatura seguinte;
            </li>
            <li>
              <strong>Pix:</strong> em geral, em até 7 dias úteis;
            </li>
            <li>
              <strong>Boleto:</strong> em geral, em até 10 dias úteis, mediante
              indicação de conta bancária para devolução.
            </li>
          </ul>
        </Section>

        <Section title="4. Após o prazo de 14 dias">
          <p>
            Passado o prazo de garantia, eventuais pedidos de reembolso serão
            analisados pela Paddle conforme sua{" "}
            <a
              href="https://www.paddle.com/legal/refund-policy"
              target="_blank"
              rel="noreferrer"
              className="underline text-[#A8006E]"
            >
              política oficial de reembolso
            </a>
            , bem como conforme a legislação consumerista aplicável.
          </p>
        </Section>

        <Section title="5. Contato">
          <p>
            {SELLER}
            <br />
            CNPJ {CNPJ}
            <br />
            {ENDERECO}
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl md:text-2xl font-semibold text-[#6B0F4B]">
        {title}
      </h2>
      <div className="mt-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Header() {
  return (
    <header className="px-6 py-5 border-b border-gray-100">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/"><Logo /></Link>
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

function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-gray-100 text-center text-xs text-gray-500">
      <p>{SELLER} — CNPJ {CNPJ}</p>
      <p className="mt-1">{ENDERECO}</p>
    </footer>
  );
}
