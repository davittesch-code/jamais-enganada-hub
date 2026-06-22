import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Jamais Enganada" },
      {
        name: "description",
        content:
          "Como a plataforma Jamais Enganada coleta, usa e protege os seus dados pessoais, em conformidade com a LGPD.",
      },
    ],
  }),
  component: PrivacidadePage,
});

const SELLER = "Juliana Fais Sociedade Individual de Advocacia";
const CNPJ = "61.844.690/0001-50";
const ENDERECO =
  "Avenida Tamandaré, 251, Sala 301 — Zona 01 — Maringá/PR — CEP 87013-210";

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#6B0F4B]">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Última atualização: 19 de junho de 2026
        </p>

        <Section title="1. Quem é a controladora dos seus dados">
          <p>
            A controladora dos seus dados pessoais é{" "}
            <strong>{SELLER}</strong>, inscrita no CNPJ sob nº {CNPJ}, com sede
            em {ENDERECO}. Ela atua como <strong>controladora</strong> dos dados
            que você nos fornece ao utilizar a plataforma{" "}
            <strong>Jamais Enganada</strong>.
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Cadastro e contato:</strong> nome, e-mail, telefone, senha
              (armazenada com hash).
            </li>
            <li>
              <strong>Perfil jurídico:</strong> respostas que você fornece à
              Sofia durante o onboarding e o tira-dúvidas (situação familiar,
              patrimonial, profissional, etc.).
            </li>
            <li>
              <strong>Histórico de uso:</strong> mensagens trocadas com a
              Sofia, perfis gerados, datas de acesso, progresso de conversa.
            </li>
            <li>
              <strong>Dados técnicos:</strong> endereço IP, identificadores de
              dispositivo, tipo de navegador, páginas acessadas, logs de erro.
            </li>
            <li>
              <strong>Dados de pagamento:</strong> CPF, telefone e dados de
              cartão são coletados e processados diretamente pela Asaas.
              Recebemos apenas confirmação de pagamento e dados mínimos para
              emissão de recibos.
            </li>

          </ul>
        </Section>

        <Section title="3. Para que usamos seus dados">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Criar e manter sua conta;</li>
            <li>Personalizar o tira-dúvidas da Sofia e gerar seu perfil jurídico;</li>
            <li>Conectar você, quando solicitado, a uma advogada parceira;</li>
            <li>Prestar suporte e responder a solicitações;</li>
            <li>Cumprir obrigações legais, regulatórias e contratuais;</li>
            <li>Prevenir fraudes e garantir a segurança da plataforma;</li>
            <li>Aprimorar a experiência e desenvolver novos recursos.</li>
          </ul>
        </Section>

        <Section title="4. Base legal (LGPD)">
          <p>Tratamos seus dados com fundamento em:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Execução do contrato</strong> (art. 7º, V) — para entregar
              o serviço contratado;
            </li>
            <li>
              <strong>Consentimento</strong> (art. 7º, I) — quando aplicável,
              especialmente para comunicações de marketing;
            </li>
            <li>
              <strong>Cumprimento de obrigação legal ou regulatória</strong>{" "}
              (art. 7º, II);
            </li>
            <li>
              <strong>Legítimo interesse</strong> (art. 7º, IX) — para
              segurança, prevenção a fraudes e melhoria do serviço.
            </li>
          </ul>
        </Section>

        <Section title="5. Com quem compartilhamos">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Asaas</strong> — instituição de pagamento brasileira
              autorizada pelo Banco Central, responsável pelo processamento de
              pagamentos (Pix e cartão), tokenização de cartão, prevenção a
              fraudes e emissão de comprovantes.
            </li>

            <li>
              <strong>Provedores de infraestrutura</strong> — serviços de
              hospedagem, banco de dados, autenticação e e-mail transacional,
              sob contrato e medidas de segurança.
            </li>
            <li>
              <strong>Provedores de inteligência artificial</strong> — para
              processar suas interações com a Sofia, em modo de uso
              profissional, sem reutilização para treinamento.
            </li>
            <li>
              <strong>Advogadas parceiras</strong> — somente quando você
              solicitar atendimento, compartilhamos apenas as informações
              necessárias para a profissional entrar em contato.
            </li>
            <li>
              <strong>Autoridades públicas</strong> — quando exigido por lei,
              ordem judicial ou requisição legítima.
            </li>
          </ul>
        </Section>

        <Section title="6. Transferência internacional">
          <p>
            Alguns de nossos provedores estão localizados fora do Brasil. Nesses
            casos, adotamos salvaguardas adequadas, como cláusulas contratuais e
            seleção de fornecedores que ofereçam grau de proteção compatível
            com a LGPD.
          </p>
        </Section>

        <Section title="7. Por quanto tempo guardamos">
          <p>
            Mantemos seus dados pelo período necessário para entrega do
            serviço, cumprimento de obrigações legais (especialmente fiscais e
            regulatórias) e exercício regular de direitos. Encerrada a
            finalidade, os dados são eliminados ou anonimizados.
          </p>
        </Section>

        <Section title="8. Seus direitos (LGPD)">
          <p>Como titular, você pode, a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Confirmar a existência de tratamento;</li>
            <li>Acessar seus dados;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar anonimização, bloqueio ou eliminação;</li>
            <li>Solicitar portabilidade;</li>
            <li>Solicitar informações sobre compartilhamentos;</li>
            <li>Revogar consentimento;</li>
            <li>Apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li>
          </ul>
          <p className="mt-3">
            Para exercer seus direitos, escreva para nosso canal de contato
            (item 11).
          </p>
        </Section>

        <Section title="9. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus
            dados, incluindo criptografia em trânsito (HTTPS), controles de
            acesso, segregação de ambientes, registros de auditoria e
            atualização contínua de nossos sistemas.
          </p>
        </Section>

        <Section title="10. Cookies">
          <p>
            Utilizamos cookies essenciais para autenticação e funcionamento da
            plataforma, e podemos utilizar cookies analíticos para entender o
            uso agregado do serviço. Você pode gerenciar cookies nas
            configurações do seu navegador. A desativação de cookies
            essenciais pode impedir o funcionamento adequado da plataforma.
          </p>
        </Section>

        <Section title="11. Contato e Encarregada (DPO)">
          <p>
            Para dúvidas, solicitações ou exercício de direitos, entre em
            contato com nossa Encarregada de Dados:
          </p>
          <p className="mt-3">
            <strong>{SELLER}</strong>
            <br />
            CNPJ {CNPJ}
            <br />
            {ENDERECO}
          </p>
        </Section>

        <Section title="12. Atualizações">
          <p>
            Esta Política pode ser atualizada a qualquer momento. A versão
            vigente estará sempre disponível nesta página, com a data da
            última atualização.
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
