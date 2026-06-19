import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirmar) return setErro("As senhas não coincidem.");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSubmitting(false);
    if (error) {
      setErro(error.message);
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
            <div className="text-sm bg-orange-50 text-orange-800 px-4 py-3 rounded-lg">
              Validando seu link de acesso… Se você abriu este link diretamente,
              verifique seu email e clique no botão "Criar minha senha".
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
                  placeholder="Mínimo 6 caracteres"
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
              {erro && (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">{erro}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
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
