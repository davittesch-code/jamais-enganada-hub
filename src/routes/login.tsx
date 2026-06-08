import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Depoimento = {
  texto: string;
  nome: string;
  papel: string;
  foto: string;
};

const DEPOIMENTOS: Depoimento[] = [
  {
    texto:
      "Descobri direitos que eu nem sabia que tinha. Hoje me sinto muito mais segura para tomar decisões.",
    nome: "Mariana S.",
    papel: "Empresária — SP",
    foto: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    texto:
      "A Sofia me ajudou a entender o processo de divórcio sem juridiquês. Mudou minha vida.",
    nome: "Carla R.",
    papel: "Professora — MG",
    foto: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    texto:
      "Em 10 minutos eu tinha um perfil jurídico completo. Nunca pensei que seria tão simples.",
    nome: "Patrícia L.",
    papel: "Designer — RJ",
    foto: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    texto:
      "Fui orientada sobre guarda dos filhos com clareza. Plataforma feita por mulheres, para mulheres.",
    nome: "Juliana M.",
    papel: "Mãe — PR",
    foto: "https://randomuser.me/api/portraits/women/12.jpg",
  },
  {
    texto:
      "O acompanhamento com a advogada parceira foi rápido e acolhedor. Recomendo demais.",
    nome: "Fernanda A.",
    papel: "Autônoma — BA",
    foto: "https://randomuser.me/api/portraits/women/32.jpg",
  },
  {
    texto:
      "Finalmente uma plataforma que fala a minha língua. Saí do medo, entrei na ação.",
    nome: "Beatriz O.",
    papel: "Médica — RS",
    foto: "https://randomuser.me/api/portraits/women/90.jpg",
  },
  {
    texto:
      "Aprendi sobre meus direitos patrimoniais antes do casamento. Conhecimento é poder.",
    nome: "Renata C.",
    papel: "Arquiteta — SC",
    foto: "https://randomuser.me/api/portraits/women/22.jpg",
  },
  {
    texto:
      "A análise foi tão completa que minha advogada elogiou. Vale cada minuto investido.",
    nome: "Larissa P.",
    papel: "Contadora — DF",
    foto: "https://randomuser.me/api/portraits/women/76.jpg",
  },
  {
    texto:
      "Saí de um relacionamento abusivo sabendo exatamente o que fazer. Obrigada por existirem.",
    nome: "Camila T.",
    papel: "Enfermeira — CE",
    foto: "https://randomuser.me/api/portraits/women/52.jpg",
  },
];


function DepoimentoCard({ d }: { d: Depoimento }) {
  return (
    <div
      className="rounded-2xl p-5 bg-white border border-[#F0DCE7] shadow-[0_8px_24px_-12px_rgba(85,39,54,0.15)]"
      style={{ width: "100%" }}
    >
      <p className="text-sm text-gray-700 leading-relaxed mb-4">"{d.texto}"</p>
      <div className="flex items-center gap-3">
        <img
          src={d.foto}
          alt={d.nome}
          loading="lazy"
          className="w-10 h-10 rounded-full object-cover border-2 border-[#F3D9E4]"
        />
        <div>
          <p className="font-semibold text-[#6B0F4B] text-sm">{d.nome}</p>
          <p className="text-xs text-gray-500">{d.papel}</p>
        </div>
      </div>
    </div>
  );
}

function ColunaScroll({
  items,
  duration,
  direction = "up",
  delay = 0,
}: {
  items: Depoimento[];
  duration: number;
  direction?: "up" | "down";
  delay?: number;
}) {
  // duplica para loop contínuo
  const loop = [...items, ...items];
  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="flex flex-col gap-4"
        style={{
          animation: `marquee-${direction} ${duration}s linear infinite`,
          animationDelay: `-${delay}s`,
        }}
      >
        {loop.map((d, i) => (
          <DepoimentoCard key={i} d={d} />
        ))}
      </div>
    </div>
  );
}

function LoginPage() {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.role === "admin") navigate({ to: "/admin" });
    else navigate({ to: "/onboarding" });
  }, [user, profile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError("E-mail ou senha incorretos.");
  };

  const col1 = DEPOIMENTOS.slice(0, 3);
  const col2 = DEPOIMENTOS.slice(3, 6);
  const col3 = DEPOIMENTOS.slice(6, 9);

  return (
    <div className="lg:h-screen lg:overflow-hidden min-h-screen flex bg-[#FDF6F9]">
      <style>{`
        @keyframes marquee-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes marquee-down {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* LADO ESQUERDO — Depoimentos */}
      <div className="hidden lg:flex relative w-1/2 xl:w-3/5 overflow-hidden">
        {/* fundo gradiente sutil */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #FDF6F9 0%, #FFFFFF 40%, #F9EAF1 100%)",
          }}
        />

        {/* Cabeçalho */}
        <div className="relative z-10 px-10 xl:px-16 py-12 flex flex-col w-full">
          <div className="mb-10 max-w-xl">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <Scale className="w-7 h-7 text-[#552736]" />
              <span className="font-display text-xl font-semibold text-[#6B0F4B]">
                Jamais Enganada
              </span>
            </Link>
            <h1 className="font-display text-3xl xl:text-4xl font-bold text-[#6B0F4B] leading-tight mb-3">
              Mulheres reais.{" "}
              <span className="italic text-[#552736]">Conquistas reais.</span>
            </h1>
            <p className="text-gray-600 text-base xl:text-lg leading-relaxed">
              Mais de mil mulheres já descobriram seus direitos com a nossa
              assessoria jurídica inteligente.
            </p>
          </div>

          {/* Colunas com movimento */}
          <div
            className="relative flex-1 grid grid-cols-3 gap-4 overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
            }}
          >
            <ColunaScroll items={col1} duration={40} direction="up" />
            <ColunaScroll items={col2} duration={50} direction="down" delay={5} />
            <ColunaScroll items={col3} duration={45} direction="up" delay={10} />
          </div>
        </div>
      </div>

      {/* LADO DIREITO — Login */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 lg:h-screen relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #6B0F4B 0%, #552736 60%, #3F1C28 100%)",
        }}
      >
        {/* Brilhos decorativos */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #A8336A 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #F0DCE7 0%, transparent 70%)" }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <Scale className="w-6 h-6 text-white" />
              <span className="font-display text-xl font-semibold text-white">
                Jamais Enganada
              </span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.4)] p-8 border border-white/20">
            <h2 className="font-display text-2xl font-bold text-[#6B0F4B] mb-1">
              Bem-vinda de volta
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Entre para continuar sua jornada.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#552736] focus:border-transparent transition"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#552736] focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="text-sm text-[#A8002B] bg-[#FEE2E2] px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #6B0F4B 0%, #552736 100%)",
                }}
              >
                {submitting ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link
                to="/cadastro"
                className="text-sm text-[#552736] hover:text-[#6B0F4B] font-medium hover:underline"
              >
                Ainda não tenho acesso
              </Link>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            🔒 Seus dados são privados e protegidos.
          </p>
        </div>
      </div>
    </div>
  );
}
