import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resendInviteEmail } from "@/lib/checkout-helpers.functions";
import {
  registrarConsentimento,
  DOC_VERSAO_TERMOS,
  DOC_VERSAO_PRIVACIDADE,
  DOC_VERSAO_AVISO_INFORMATIVO,
} from "@/lib/consentimentos.functions";


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
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [aceito, setAceito] = useState(false);
  const resendFn = useServerFn(resendInviteEmail);
  const registrarConsentimentoFn = useServerFn(registrarConsentimento);
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
    if (!aceito)
      return setErro("Para continuar, você precisa aceitar os Termos de Uso e a Política de Privacidade.");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSubmitting(false);
      setErro(traduzirErro(error.message));
      return;
    }
    try {
      await registrarConsentimentoFn({
        data: {
          documentos: [
            { documento: "termos", versao: DOC_VERSAO_TERMOS },
            { documento: "privacidade", versao: DOC_VERSAO_PRIVACIDADE },
          ],
        },
      });
    } catch (err) {
      // Não bloqueia a continuação — registramos no console para diagnóstico.
      console.error("Falha ao registrar consentimento", err);
    }
    setSubmitting(false);
    navigate({ to: "/onboarding" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 safe-pt safe-pb"
      style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="font-display text-2xl sm:text-3xl font-semibold text-white">
            Jamais Enganada
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
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
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={reenvioEmail}
                      onChange={(e) => setReenvioEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="flex-1 px-3 py-3 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                      style={{ fontSize: "16px" }}
                    />
                    <button
                      type="submit"
                      disabled={reenviando}
                      className="px-4 min-h-[44px] text-sm font-semibold text-white rounded-lg disabled:opacity-50 active:scale-[0.98]"
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
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-4 py-3 pr-12 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                    style={{ fontSize: "16px" }}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-500 hover:text-[#6B0F4B]"
                  >
                    {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={showConfirmar ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    className="w-full px-4 py-3 pr-12 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                    style={{ fontSize: "16px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar((v) => !v)}
                    aria-label={showConfirmar ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-500 hover:text-[#6B0F4B]"
                  >
                    {showConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
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

              <label className="flex items-start gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={aceito}
                  onChange={(e) => setAceito(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#A8006E]"
                  required
                />
                <span>
                  Li e concordo com os{" "}
                  <Link
                    to="/termos"
                    target="_blank"
                    className="underline font-medium"
                    style={{ color: "#6B0F4B" }}
                  >
                    Termos de Uso
                  </Link>{" "}
                  e com a{" "}
                  <Link
                    to="/privacidade"
                    target="_blank"
                    className="underline font-medium"
                    style={{ color: "#6B0F4B" }}
                  >
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>

              {erro && (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">{erro}</div>
              )}
              <button
                type="submit"
                disabled={submitting || !senhaValida || !aceito}
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

