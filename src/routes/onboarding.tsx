import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatBubble } from "@/components/onboarding/ChatBubble";
import { TypingIndicator } from "@/components/onboarding/TypingIndicator";
import { ChatInput } from "@/components/onboarding/ChatInput";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useOnboarding } from "@/components/onboarding/useOnboarding";
import { AdvogadaPicker } from "@/components/onboarding/AdvogadaPicker";

function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) navigate({ to: "/login" });
  }, [mounted, loading, user, navigate]);

  if (!mounted || loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#FDF6F9]"
        suppressHydrationWarning
      >
        <div className="w-8 h-8 border-2 border-[#A8006E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

function SplashScreen({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh w-full px-6 py-10 text-center text-white"
      style={{
        background:
          "linear-gradient(160deg, #A8006E 0%, #6B0F4B 100%)",
      }}
    >
      <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-4xl mb-6 shadow-lg">
        ⚖️
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-semibold mb-3">
        Jamais Enganada
      </h1>

      <p className="text-base md:text-lg text-white/90 max-w-md mb-2">
        Sua assessora jurídica pessoal está pronta para te ouvir.
      </p>

      <p className="text-sm text-white/75 max-w-md mb-10 leading-relaxed">
        Em poucos minutos, vamos criar o seu perfil jurídico completo —
        feito especialmente para você.
      </p>

      <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-md w-full mb-10">
        <div className="flex flex-col items-center gap-2 px-2">
          <div className="text-2xl">🔒</div>
          <p className="text-xs text-white/85 leading-tight">
            100%
            <br />
            confidencial
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 px-2">
          <div className="text-2xl">💜</div>
          <p className="text-xs text-white/85 leading-tight">
            Com
            <br />
            acolhimento
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 px-2">
          <div className="text-2xl">⚡</div>
          <p className="text-xs text-white/85 leading-tight">
            Resultado
            <br />
            imediato
          </p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="bg-white text-[#A8006E] font-semibold px-10 py-4 rounded-full text-base hover:bg-white/90 transition-all shadow-lg"
      >
        Começar minha jornada →
      </button>

      <p className="text-[11px] text-white/60 max-w-xs mt-8 leading-relaxed">
        Suas respostas ficam protegidas e são usadas apenas para criar seu perfil.
      </p>
    </div>
  );
}

function OnboardingPage() {
  const {
    messages,
    isTyping,
    progress,
    isComplete,
    showCtaButton,
    showSplash,
    setShowSplash,
    handleUserReply,
    inputDisabled,
    showAdvogadaPicker,
    advogadas,
    submitAdvogadaSelection,
  } = useOnboarding();
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isComplete, showCtaButton]);

  if (showSplash) {
    return <SplashScreen onStart={() => setShowSplash(false)} />;
  }

  return (
    <div
      className="flex flex-col h-dvh w-full animate-in fade-in duration-500"
      style={{ background: "#FDF6F9" }}
    >
      <div className="sticky top-0 z-10">
        <ProgressBar percent={progress} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} sender={msg.sender} message={msg.text} />
          ))}
          {isTyping && <TypingIndicator />}
          {showAdvogadaPicker && (
            <AdvogadaPicker
              advogadas={advogadas}
              onSubmit={submitAdvogadaSelection}
            />
          )}
          {showCtaButton && (
            <div
              className="flex justify-center my-6 transition-opacity duration-500"
              style={{ opacity: showCtaButton ? 1 : 0 }}
            >
              <button
                onClick={() => navigate({ to: "/consulta" })}
                className="px-8 py-3 rounded-full text-base font-medium text-white transition-colors"
                style={{ background: "#A8006E" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#6B0F4B")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#A8006E")
                }
              >
                Iniciar minha consulta →
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSend={handleUserReply}
            disabled={inputDisabled || isComplete || showAdvogadaPicker}
          />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <OnboardingGuard>
      <OnboardingPage />
    </OnboardingGuard>
  ),
});
