import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, UserCircle, Heart, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jamais Enganada — Conheça seus direitos. Proteja sua vida." },
      { name: "description", content: "Plataforma jurídica de autocuidado para mulheres. Descubra seu perfil jurídico com acompanhamento humano e inteligente." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-semibold text-primary">
            Jamais Enganada
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-foreground hover:text-primary px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-[var(--shadow-elegant)]"
            >
              Quero meu perfil jurídico
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="px-6 py-24 md:py-32"
        style={{ background: "var(--gradient-soft)" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Autocuidado jurídico feito para você
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-semibold leading-tight text-foreground">
            Conheça seus direitos.
            <br />
            <span className="text-primary">Proteja sua vida.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Uma plataforma criada para mulheres que merecem clareza, segurança e acolhimento.
            Descubra seu perfil jurídico em uma conversa simples — sem juridiquês.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity shadow-[var(--shadow-elegant)]"
            >
              Quero meu perfil jurídico <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full font-medium border border-border hover:bg-accent transition-colors"
            >
              Já tenho acesso
            </Link>
          </div>
        </div>
      </section>

      {/* Etapas */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">Três etapas para você se sentir segura.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MessageCircle, step: "01", title: "Consulta", desc: "Converse com nossa IA empática. Ela escuta sua história e identifica os pontos jurídicos que importam." },
              { icon: UserCircle, step: "02", title: "Perfil", desc: "Receba um perfil jurídico personalizado com insights, pontos de atenção e próximos passos." },
              { icon: Heart, step: "03", title: "Acompanhamento", desc: "Tire dúvidas, acesse assessoria especializada e mantenha-se segura ao longo do tempo." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div
                key={step}
                className="bg-card border rounded-2xl p-8 hover:shadow-[var(--shadow-elegant)] transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary mb-2">ETAPA {step}</div>
                <h3 className="font-display text-2xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-6 py-24 bg-accent/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Por que Jamais Enganada</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: "Linguagem acessível", desc: "Sem juridiquês. Você entende cada palavra e cada decisão." },
              { title: "100% confidencial", desc: "Seus dados ficam protegidos. Só você e advogadas autorizadas têm acesso." },
              { title: "Acolhimento humano", desc: "Construído por e para mulheres. Sem julgamentos, com escuta atenta." },
              { title: "Advogadas parceiras", desc: "Quando precisar, conecte-se a profissionais de confiança." },
            ].map((b) => (
              <div key={b.title} className="flex gap-4">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">{b.title}</h3>
                  <p className="text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-display text-lg text-primary">Jamais Enganada</div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} — Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
