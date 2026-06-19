import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resendInviteEmail } from "@/lib/checkout-helpers.functions";


export const Route = createFileRoute("/criar-senha")({
  component: CriarSenhaPage,
});

function CriarSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronta, setPronta] = useState(false);
  const resendFn = useServerFn(resendInviteEmail);
  const [reenvioEmail, setReenvioEmail] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);


  // O link de convite do Supabase já restaura a sessão automaticamente (detectSessionInUrl).
  // Aguardamos a sessão ficar disponível antes de liberar o formulário.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setPronta(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setPronta(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Regras de senha — refletem a configuração do backend (mínimo 8 caracteres,
  // letras + números; senhas vazadas são bloqueadas pelo Supabase via HIBP).
  const regras = [
    { ok: senha.length >= 8, txt: "Pelo menos 8 caracteres" },
    { ok: /[A-Za-z]/.test(senha), txt: "Pelo menos 1 letra" },
    { ok: /[0-9]/.test(senha), txt: "Pelo menos 1 número" },
    { ok: senha.length > 0 && senha === confirmar, txt: "As duas senhas coincidem" },
  ];
  const senhaValida = regras.every((r) => r.ok);

  const traduzirErro = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("pwned") || m.includes("compromised") || m.includes("data breach"))
      return "Essa senha já apareceu em vazamentos de dados públicos. Por segurança, escolha uma senha diferente — combine letras, números e algo único só seu.";
    if (m.includes("weak") || m.includes("strength"))
      return "Senha muito fraca. Use pelo menos 8 caracteres misturando letras e números.";
    if (m.includes("at least") && m.includes("character"))
      return "A senha precisa ter pelo menos 8 caracteres.";
    if (m.includes("should be different") || m.includes("same as the old"))
      return "A nova senha precisa ser diferente da anterior.";
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!senhaValida) return setErro("Sua senha ainda não cumpre todos os requisitos abaixo.");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSubmitting(false);
    if (error) {
      setErro(traduzirErro(error.message));
      return;
    }
    navigate({ to: "/onboarding" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl font-semibold text-white">
            Jamais Enganada
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="font-display text-2xl font-semibold mb-2 text-[#6B0F4B]">
            Bem-vinda! 💜
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Crie sua senha para começar sua jornada de autocuidado jurídico.
          </p>

          {!pronta ? (
            <div className="space-y-4">
              <div className="text-sm bg-orange-50 text-orange-800 px-4 py-3 rounded-lg">
                Validando seu link de acesso… Se você abriu este link diretamente,
                verifique seu email e clique no botão "Criar minha senha".
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600 mb-2">
                  Não recebeu o email ou o link expirou? Digite seu email que reenviamos:
                </p>
                {reenviado ? (
                  <p className="text-sm text-[#0F7B5A]">
                    ✓ Enviamos um novo link. Confira sua caixa em alguns minutos.
                  </p>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!reenvioEmail.trim()) return;
                      setReenviando(true);
                      try {
                        await resendFn({ data: { email: reenvioEmail.trim() } });
                        setReenviado(true);
                      } finally {
                        setReenviando(false);
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="email"
                      required
                      value={reenvioEmail}
                      onChange={(e) => setReenvioEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                    />
                    <button
                      type="submit"
                      disabled={reenviando}
                      className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: "#A8006E" }}
                    >
                      {reenviando ? "…" : "Reenviar"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  placeholder="Mínimo 8 caracteres com letras e números"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirmar senha</label>
                <input
                  type="password"
                  required
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                />
              </div>

              <ul className="text-xs space-y-1 bg-[#FDF6F9] rounded-lg p-3">
                {regras.map((r) => (
                  <li
                    key={r.txt}
                    className={r.ok ? "text-[#0F7B5A]" : "text-gray-500"}
                  >
                    {r.ok ? "✓" : "○"} {r.txt}
                  </li>
                ))}
                <li className="text-gray-500">
                  ○ Evite senhas óbvias ou que você já usa em outros sites
                </li>
              </ul>

              {erro && (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">{erro}</div>
              )}
              <button
                type="submit"
                disabled={submitting || !senhaValida}
                className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#A8006E" }}
              >
                {submitting ? "Salvando…" : "Salvar e começar"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-white/80 text-center mt-6">
          Conhecimento é proteção. 💜
        </p>
      </div>
    </div>
  );
}
