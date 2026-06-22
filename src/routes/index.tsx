import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  MessageCircle,
  UserCircle,
  Heart,
  Sparkles,
  ArrowRight,
  Lock,
  HandHeart,
  Scale,
  BookOpen,
  Quote,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jamais Enganada — Conheça seus direitos. Proteja sua vida." },
      {
        name: "description",
        content:
          "Plataforma jurídica de autocuidado para mulheres. Descubra seu perfil jurídico com acompanhamento humano e inteligente.",
      },
    ],
  }),
  component: Landing,
});

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".je-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

const DEPOIMENTOS = [
  {
    texto:
      "Descobri direitos que eu nem sabia que tinha. Hoje me sinto muito mais segura para tomar decisões.",
    nome: "Mariana S.",
    papel: "Empresária — SP",
    destaque: true,
  },
  {
    texto: "Em 10 minutos eu tinha um perfil jurídico completo. Nunca pensei que seria tão simples.",
    nome: "Patrícia L.",
    papel: "Designer — RJ",
  },
  {
    texto: "A Sofia me ajudou a entender o divórcio sem juridiquês. Mudou minha vida.",
    nome: "Carla R.",
    papel: "Professora — MG",
  },
  {
    texto: "Saí de um relacionamento abusivo sabendo exatamente o que fazer. Obrigada por existirem.",
    nome: "Camila T.",
    papel: "Enfermeira — CE",
  },
];

function Landing() {
  const rootRef = useRevealOnScroll();

  return (
    <div ref={rootRef} className="min-h-screen" style={{ background: "var(--creme-base)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "rgba(251, 247, 244, 0.85)",
          borderBottom: "1px solid var(--neutro-borda)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-sm font-medium px-3 py-2 hidden sm:inline-flex"
              style={{ color: "var(--texto-principal)" }}
            >
              Entrar
            </Link>
            <Link to="/checkout" className="btn-primary text-sm">
              Quero meu perfil
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — assimétrico */}
      <section className="relative overflow-hidden">
        {/* Blob orgânico */}
        <div
          className="absolute pointer-events-none je-blob"
          style={{
            top: "-120px",
            right: "-160px",
            width: 520,
            height: 520,
            background:
              "radial-gradient(circle at 30% 30%, rgba(168,0,110,0.18), rgba(243,232,240,0.0) 65%)",
            filter: "blur(20px)",
          }}
          aria-hidden
        />
        <div
          className="absolute pointer-events-none je-blob"
          style={{
            bottom: "-200px",
            left: "-100px",
            width: 440,
            height: 440,
            background:
              "radial-gradient(circle at 40% 40%, rgba(201,168,106,0.18), rgba(251,247,244,0.0) 70%)",
            filter: "blur(24px)",
            animationDelay: "-7s",
          }}
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-20 md:pb-28 grid md:grid-cols-12 gap-10 items-center">
          {/* Texto */}
          <div className="md:col-span-7 je-reveal">
            <span
              className="pill mb-6"
              style={{ background: "var(--rosa-suave)", color: "var(--vinho-profundo)" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Mais de 1.000 mulheres protegidas
            </span>
            <h1
              className="font-display leading-[1.02]"
              style={{
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 500,
                color: "var(--texto-principal)",
                letterSpacing: "-0.03em",
              }}
            >
              Conheça seus direitos.
              <br />
              <span style={{ fontStyle: "italic", color: "var(--magenta-acao)" }}>
                Proteja sua vida.
              </span>
            </h1>
            <p
              className="mt-6 text-lg leading-relaxed max-w-xl"
              style={{ color: "var(--texto-secundario)" }}
            >
              Uma plataforma criada para mulheres que merecem clareza, segurança e
              acolhimento. Descubra seu perfil jurídico em uma conversa simples — sem
              juridiquês.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to="/checkout" className="btn-primary group">
                Quero meu perfil jurídico
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/login" className="btn-secondary">
                Já tenho acesso
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-5 text-xs" style={{ color: "var(--texto-secundario)" }}>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> 100% confidencial
              </span>
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "var(--neutro-borda)" }}
                aria-hidden
              />
              <span>Acesso por 1 ano</span>
            </div>
          </div>

          {/* Mockup */}
          <div className="md:col-span-5 je-reveal" style={{ animationDelay: "120ms" }}>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* Números — faixa vinho */}
      <section style={{ background: "var(--vinho-profundo)", color: "#FBF7F4" }}>
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          {[
            { n: "17", l: "tira-dúvidas jurídicos" },
            { n: "1 ano", l: "de acesso completo" },
            { n: "100%", l: "confidencial" },
            { n: "7 áreas", l: "do direito analisadas" },
          ].map((item, i) => (
            <div key={i} className="text-center md:text-left je-reveal" style={{ animationDelay: `${i * 70}ms` }}>
              <div
                className="font-display"
                style={{
                  fontSize: "clamp(36px, 4.2vw, 56px)",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  color: "#FBF7F4",
                  lineHeight: 1,
                }}
              >
                {item.n}
              </div>
              <div
                className="mt-2 text-xs uppercase tracking-widest"
                style={{ color: "var(--champagne)", fontWeight: 500 }}
              >
                {item.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-24 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 je-reveal">
            <span
              className="pill mb-4"
              style={{ background: "var(--rosa-suave)", color: "var(--vinho-profundo)" }}
            >
              Como funciona
            </span>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 500,
                color: "var(--texto-principal)",
              }}
            >
              Três passos para se sentir{" "}
              <span style={{ fontStyle: "italic", color: "var(--magenta-acao)" }}>segura</span>.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Linha conectora */}
            <div
              className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--champagne) 30%, var(--champagne) 70%, transparent)",
              }}
              aria-hidden
            />
            {[
              {
                icon: MessageCircle,
                step: "01",
                title: "Conte sua história",
                desc: "Converse com a Sofia. Ela escuta com empatia e identifica os pontos jurídicos que importam.",
              },
              {
                icon: UserCircle,
                step: "02",
                title: "Receba seu perfil",
                desc: "Em minutos, um perfil jurídico personalizado com insights e pontos de atenção.",
              },
              {
                icon: Heart,
                step: "03",
                title: "Aja com segurança",
                desc: "Tire dúvidas, acesse assessoria especializada e mantenha-se protegida.",
              },
            ].map(({ icon: Icon, step, title, desc }, i) => (
              <div
                key={step}
                className="je-reveal relative card-soft"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5 font-display"
                  style={{
                    background: "var(--gradient-cta)",
                    color: "#FBF7F4",
                    fontWeight: 500,
                    fontSize: 20,
                    boxShadow: "var(--elevacao-2)",
                  }}
                >
                  {step}
                </div>
                <Icon className="w-5 h-5 mb-3" style={{ color: "var(--champagne)" }} />
                <h3
                  className="font-display text-2xl mb-2"
                  style={{ color: "var(--vinho-profundo)", fontWeight: 500 }}
                >
                  {title}
                </h3>
                <p style={{ color: "var(--texto-secundario)" }} className="leading-relaxed text-sm">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por que */}
      <section className="px-6 py-24" style={{ background: "var(--rosa-suave)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 je-reveal">
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 500,
                color: "var(--vinho-profundo)",
              }}
            >
              Por que{" "}
              <span style={{ fontStyle: "italic" }}>Jamais Enganada</span>
            </h2>
            <p className="mt-3" style={{ color: "var(--texto-secundario)" }}>
              Construído por mulheres, para mulheres.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: BookOpen,
                title: "Linguagem acessível",
                desc: "Sem juridiquês. Você entende cada palavra e cada decisão.",
                tint: "var(--rosa-suave)",
              },
              {
                icon: Lock,
                title: "100% confidencial",
                desc: "Seus dados ficam protegidos. Só você e advogadas autorizadas têm acesso.",
                tint: "#FFFFFF",
              },
              {
                icon: HandHeart,
                title: "Acolhimento humano",
                desc: "Sem julgamentos, com escuta atenta. Você no centro de tudo.",
                tint: "#FFFFFF",
              },
              {
                icon: Scale,
                title: "Advogadas parceiras",
                desc: "Quando precisar, conecte-se a profissionais de confiança.",
                tint: "var(--champagne-claro)",
              },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="je-reveal card-interactive"
                  style={{ background: b.tint, animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--vinho-profundo)", color: "#FBF7F4" }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        className="font-display text-xl mb-1"
                        style={{ color: "var(--vinho-profundo)", fontWeight: 500 }}
                      >
                        {b.title}
                      </h3>
                      <p style={{ color: "var(--texto-secundario)" }} className="text-sm leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="px-6 py-24 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 je-reveal">
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 500,
                color: "var(--texto-principal)",
              }}
            >
              Histórias{" "}
              <span style={{ fontStyle: "italic", color: "var(--magenta-acao)" }}>reais</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {/* Destaque */}
            <div
              className="md:col-span-2 md:row-span-2 je-reveal relative overflow-hidden"
              style={{
                background: "var(--vinho-profundo)",
                borderRadius: 20,
                padding: "40px 36px",
                boxShadow: "var(--elevacao-2)",
                color: "#FBF7F4",
              }}
            >
              <Quote
                className="absolute opacity-15"
                style={{ top: 16, right: 20, width: 120, height: 120, color: "var(--champagne)" }}
                aria-hidden
              />
              <p
                className="font-display relative z-10 leading-snug"
                style={{ fontSize: "clamp(22px, 2.4vw, 30px)", fontWeight: 400, fontStyle: "italic" }}
              >
                "{DEPOIMENTOS[0].texto}"
              </p>
              <div className="mt-8 flex items-center gap-3 relative z-10">
                <LogoMark variant="light" size={44} />
                <div>
                  <div className="font-medium">{DEPOIMENTOS[0].nome}</div>
                  <div className="text-xs" style={{ color: "var(--champagne)" }}>
                    {DEPOIMENTOS[0].papel}
                  </div>
                </div>
              </div>
            </div>

            {DEPOIMENTOS.slice(1).map((d, i) => (
              <div
                key={d.nome}
                className="je-reveal card-soft"
                style={{
                  background: i % 2 === 0 ? "var(--creme-card)" : "var(--rosa-suave)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <Quote
                  className="w-6 h-6 mb-3"
                  style={{ color: "var(--magenta-acao)", opacity: 0.6 }}
                  aria-hidden
                />
                <p className="text-sm leading-relaxed" style={{ color: "var(--texto-principal)" }}>
                  "{d.texto}"
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <LogoMark variant="soft" size={36} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--vinho-profundo)" }}>
                      {d.nome}
                    </div>
                    <div className="text-xs" style={{ color: "var(--texto-secundario)" }}>
                      {d.papel}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 pb-24">
        <div
          className="max-w-5xl mx-auto je-reveal text-center px-8 py-16"
          style={{
            borderRadius: 24,
            background: "var(--gradient-hero)",
            color: "#FBF7F4",
            boxShadow: "var(--elevacao-3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, rgba(201,168,106,0.25), transparent 50%)",
            }}
            aria-hidden
          />
          <h2
            className="font-display relative"
            style={{ fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 500 }}
          >
            Sua proteção começa com{" "}
            <span style={{ fontStyle: "italic", color: "var(--champagne)" }}>conhecimento</span>.
          </h2>
          <p className="mt-4 relative opacity-90 max-w-xl mx-auto">
            Comece agora. Em poucos minutos você terá seu perfil jurídico completo.
          </p>
          <Link
            to="/checkout"
            className="relative inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-full font-medium group"
            style={{
              background: "#FBF7F4",
              color: "var(--vinho-profundo)",
              boxShadow: "var(--elevacao-2)",
            }}
          >
            Garantir meu acesso
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--vinho-profundo)", color: "#FBF7F4" }}>
        <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-10">
          <div>
            <Logo size="md" variant="light" />
            <p
              className="mt-4 font-display italic text-lg"
              style={{ color: "var(--champagne)", fontWeight: 400 }}
            >
              Conhecimento é proteção.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--champagne)" }}>
              Plataforma
            </div>
            <ul className="space-y-2 text-sm" style={{ color: "#FBF7F4" }}>
              <li>
                <Link to="/checkout" className="hover:underline">
                  Comprar acesso
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:underline">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/termos" className="hover:underline">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="hover:underline">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--champagne)" }}>
              Contato
            </div>
            <p className="text-sm opacity-90">contato@jamaisenganada.com.br</p>
          </div>
        </div>
        <div
          className="border-t py-6 px-6 text-xs text-center"
          style={{ borderColor: "rgba(251,247,244,0.12)", color: "rgba(251,247,244,0.6)" }}
        >
          © {new Date().getFullYear()} Jamais Enganada — Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

/** Mockup do card "Perfil Jurídico" usado no hero. */
function HeroMockup() {
  return (
    <div className="relative" style={{ maxWidth: 380, marginLeft: "auto" }}>
      <div
        className="relative p-6"
        style={{
          background: "var(--creme-card)",
          borderRadius: 20,
          boxShadow: "var(--elevacao-3)",
          border: "1px solid var(--neutro-borda)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <span
            className="pill"
            style={{
              background: "var(--rosa-suave)",
              color: "var(--vinho-profundo)",
              fontSize: 10,
            }}
          >
            PERFIL JURÍDICO
          </span>
          <LogoMark size={32} variant="soft" />
        </div>

        <h3
          className="font-display"
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "var(--vinho-profundo)",
            letterSpacing: "-0.02em",
          }}
        >
          Mariana, 34
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--texto-secundario)" }}>
          Empresária · SP
        </p>

        <div className="mt-5 space-y-3">
          {[
            { label: "Família", value: 75, tint: "var(--magenta-acao)" },
            { label: "Patrimônio", value: 55, tint: "var(--champagne)" },
            { label: "Trabalho", value: 88, tint: "var(--vinho-profundo)" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span style={{ color: "var(--texto-principal)", fontWeight: 500 }}>
                  {row.label}
                </span>
                <span style={{ color: "var(--texto-secundario)" }}>{row.value}%</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--neutro-borda)" }}
              >
                <div
                  style={{
                    width: `${row.value}%`,
                    height: "100%",
                    background: row.tint,
                    transition: "width 800ms ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-5 pt-4 flex items-center gap-2 text-xs"
          style={{ borderTop: "1px solid var(--neutro-borda)", color: "var(--texto-secundario)" }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--champagne)" }} />
          Atualizado há 2 minutos
        </div>
      </div>

      {/* Card flutuante secundário */}
      <div
        className="absolute hidden sm:flex items-center gap-2.5 px-4 py-3"
        style={{
          background: "var(--creme-card)",
          borderRadius: 14,
          boxShadow: "var(--elevacao-2)",
          border: "1px solid var(--neutro-borda)",
          bottom: -20,
          left: -32,
          maxWidth: 220,
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--rosa-suave)" }}
        >
          <Heart className="w-4 h-4" style={{ color: "var(--magenta-acao)" }} />
        </div>
        <div className="leading-tight">
          <div className="text-xs font-medium" style={{ color: "var(--vinho-profundo)" }}>
            17 tira-dúvidas
          </div>
          <div className="text-[10px]" style={{ color: "var(--texto-secundario)" }}>
            disponíveis no plano
          </div>
        </div>
      </div>
    </div>
  );
}
