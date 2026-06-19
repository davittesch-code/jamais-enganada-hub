import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Jamais Enganada" },
      {
        name: "description",
        content:
          "Termos e Condições de Uso da plataforma Jamais Enganada, mantida por Juliana Fais Sociedade Individual de Advocacia.",
      },
    ],
  }),
  component: TermosPage,
});

const SELLER = "Juliana Fais Sociedade Individual de Advocacia";
const CNPJ = "61.844.690/0001-50";
const ENDERECO =
  "Avenida Tamandaré, 251, Sala 301 — Zona 01 — Maringá/PR — CEP 87013-210";

function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#6B0F4B]">
          Termos e Condições de Uso
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Última atualização: 19 de junho de 2026
        </p>

        <Section title="1. Quem somos">
          <p>
            A plataforma <strong>Jamais Enganada</strong> ("Plataforma", "nós") é
            operada por <strong>{SELLER}</strong>, inscrita no CNPJ sob nº {CNPJ},
            com sede em {ENDERECO} ("Sociedade", "nós"). Ao contratar nossos
            serviços, você está celebrando contrato diretamente com a Sociedade.
          </p>
        </Section>

        <Section title="2. Aceitação">
          <p>
            Ao acessar, cadastrar-se ou utilizar a Plataforma, você declara ter
            lido, compreendido e aceito integralmente estes Termos. Caso não
            concorde, por favor não utilize a Plataforma.
          </p>
        </Section>

        <Section title="3. O que oferecemos">
          <p>
            A Plataforma é um serviço digital de <em>autocuidado jurídico</em>{" "}
            voltado a mulheres. Inclui uma assistente de inteligência artificial
            ("Sofia"), geração de um perfil jurídico personalizado, conteúdos
            informativos e a possibilidade de acompanhamento por advogadas
            parceiras independentes.
          </p>
          <p className="mt-3">
            <strong>A Plataforma não substitui consulta jurídica formal.</strong>{" "}
            As informações fornecidas pela Sofia e pelos materiais têm caráter
            educativo e orientativo, e podem conter imprecisões. Decisões
            relevantes devem ser tomadas com o suporte de uma profissional do
            Direito devidamente habilitada.
          </p>
        </Section>

        <Section title="4. Cadastro e responsabilidade da usuária">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Você deve ter ao menos 18 anos e fornecer informações verdadeiras,
              atualizadas e completas.
            </li>
            <li>
              É responsável por manter a confidencialidade de suas credenciais e
              por toda atividade realizada com sua conta.
            </li>
            <li>
              Concorda em comunicar imediatamente qualquer uso não autorizado de
              sua conta.
            </li>
          </ul>
        </Section>

        <Section title="5. Uso permitido">
          <p>Você concorda em não:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Utilizar a Plataforma para fins ilícitos, fraudulentos ou ofensivos;</li>
            <li>Praticar spam, engenharia social ou tentar enganar outras usuárias;</li>
            <li>Violar direitos de propriedade intelectual, imagem ou privacidade;</li>
            <li>
              Interferir na segurança da Plataforma, incluindo introdução de
              malware, varredura, raspagem (<em>scraping</em>) ou contorno de
              limitações técnicas;
            </li>
            <li>
              Revender, redistribuir, sublicenciar ou explorar comercialmente o
              conteúdo da Plataforma.
            </li>
          </ul>
        </Section>

        <Section title="6. Propriedade intelectual">
          <p>
            Todo o conteúdo da Plataforma — incluindo software, textos, marcas,
            logotipos, identidade visual, materiais e a personagem Sofia — é de
            titularidade exclusiva da Sociedade ou de seus licenciantes. Você
            recebe uma licença limitada, não exclusiva, intransferível e
            revogável para uso pessoal, dentro do plano contratado.
          </p>
        </Section>

        <Section title="7. Conteúdo gerado por inteligência artificial">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              As respostas e perfis gerados pela Sofia são produzidos por
              modelos de IA e podem conter imprecisões ou desatualizações;
            </li>
            <li>
              Você é responsável pelas informações que fornece à Sofia e por
              como utiliza as respostas recebidas;
            </li>
            <li>
              É proibido utilizar a Sofia para gerar conteúdo ilegal, ofensivo,
              discriminatório, difamatório, ou que viole direitos de terceiros;
            </li>
            <li>
              A Sociedade reserva-se o direito de moderar, filtrar ou restringir
              respostas, bem como suspender contas que façam mau uso da
              ferramenta.
            </li>
          </ul>
        </Section>

        <Section title="8. Pagamentos">
          <p>
            Nosso processo de pedidos é conduzido pelo nosso revendedor online
            <strong> Paddle.com</strong>. A Paddle.com é o <em>Merchant of Record</em>{" "}
            (revendedor oficial) de todos os nossos pedidos. A Paddle realiza
            todo o atendimento de pedidos relacionados a faturamento, impostos,
            cobrança e devoluções.
          </p>
          <p className="mt-3">
            Os termos de pagamento, faturamento, tributos, cancelamento e
            reembolso aplicáveis estão descritos nos{" "}
            <a
              href="https://www.paddle.com/legal/checkout-buyer-terms"
              target="_blank"
              rel="noreferrer"
              className="underline text-[#A8006E]"
            >
              Termos de Compra da Paddle
            </a>
            . Consulte também nossa{" "}
            <Link to="/reembolso" className="underline text-[#A8006E]">
              Política de Reembolso
            </Link>
            .
          </p>
        </Section>

        <Section title="9. Suspensão e encerramento">
          <p>
            Podemos suspender ou encerrar seu acesso, com ou sem aviso prévio,
            nas hipóteses de: (i) violação destes Termos; (ii) inadimplência;
            (iii) risco de segurança ou fraude; (iv) violações repetidas ou
            graves às nossas políticas; (v) determinação legal ou judicial.
          </p>
        </Section>

        <Section title="10. Limitação de responsabilidade">
          <p>
            Na máxima extensão permitida pela lei, a Sociedade não se
            responsabiliza por danos indiretos, lucros cessantes, perda de
            dados ou de oportunidade. Nada nestes Termos exclui responsabilidade
            por dolo, fraude ou hipóteses em que a lei vede limitação.
          </p>
        </Section>

        <Section title="11. Disponibilidade">
          <p>
            Empenhamo-nos para manter a Plataforma disponível e segura, mas não
            garantimos funcionamento ininterrupto ou livre de erros. Podemos
            realizar manutenções, atualizações ou descontinuar funcionalidades.
          </p>
        </Section>

        <Section title="12. Alterações destes Termos">
          <p>
            Podemos atualizar estes Termos periodicamente. A versão vigente
            estará sempre disponível nesta página, com indicação da data de
            atualização. Mudanças relevantes serão comunicadas à usuária.
          </p>
        </Section>

        <Section title="13. Lei aplicável e foro">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do
            Brasil. Fica eleito o foro da Comarca de Maringá/PR para dirimir
            quaisquer controvérsias, com renúncia a qualquer outro, por mais
            privilegiado que seja.
          </p>
        </Section>

        <Section title="14. Contato">
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
