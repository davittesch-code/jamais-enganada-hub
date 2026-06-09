import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatBubble } from "@/components/onboarding/ChatBubble";
import { TypingIndicator } from "@/components/onboarding/TypingIndicator";
import { ChatInput } from "@/components/onboarding/ChatInput";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { QuickReply } from "@/components/consulta/QuickReply";
import { useConsulta } from "@/components/consulta/useConsulta";

function ConsultaGuard({ children }: { children: ReactNode }) {
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
        <div className="w-8 h-8 border-2 border-[#552736] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}

function LoadingOverlay({ text }: { text: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "rgba(253, 246, 249, 0.96)" }}
    >
      <div
        className="w-14 h-14 rounded-full border-4 mb-6"
        style={{
          borderColor: "#F3E8F0",
          borderTopColor: "#552736",
          animation: "consulta-spin 1s linear infinite",
        }}
      />
      <p className="text-base font-medium mb-2" style={{ color: "#6B0F4B" }}>
        Gerando seu perfil...
      </p>
      <p
        key={text}
        className="text-sm transition-opacity duration-500"
        style={{ color: "#552736", animation: "consulta-fade 500ms ease-out" }}
      >
        {text}
      </p>
      <style>{`
        @keyframes consulta-spin { to { transform: rotate(360deg); } }
        @keyframes consulta-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

function ErrorOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
      style={{ background: "rgba(253, 246, 249, 0.98)" }}
    >
      <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
        <div className="text-4xl">⚠️</div>
        <p className="text-[#6B0F4B] font-medium">
          Houve um problema ao gerar seu perfil.
        </p>
        <p className="text-sm text-gray-500">
          Suas respostas foram salvas. Tente novamente.
        </p>
        <button
          onClick={onRetry}
          className="bg-[#552736] text-white px-6 py-2 rounded-full text-sm"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function ConsultaPage() {
  const {
    messages,
    isTyping,
    progress,
    currentOptions,
    currentMultiSelect,
    inputDisabled,
    isGenerating,
    loadingText,
    handleReply,
    erroGeracao,
    retryGerar,
  } = useConsulta();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, currentOptions]);

  return (
    <div
      className="relative flex flex-col h-dvh w-full"
      style={{ background: "#FDF6F9" }}
    >
      <div className="sticky top-0 z-10">
        <ProgressBar percent={progress} />
        <div
          className="text-[11px] text-center px-3 py-1 bg-white border-b"
          style={{ color: "#6B0F4B", borderColor: "#F3E8F0" }}
        >
          Construindo seu perfil...
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} sender={msg.sender} message={msg.text} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {!isGenerating && !erroGeracao && (
        <div className="sticky bottom-0">
          <div className="max-w-2xl mx-auto">
            {currentOptions && currentOptions.length > 0 && (
              <QuickReply
                options={currentOptions}
                multiSelect={currentMultiSelect}
                onSelect={(opts) => handleReply(opts.join(", "))}
                disabled={inputDisabled}
              />
            )}
            <ChatInput
              onSend={handleReply}
              disabled={inputDisabled || (currentOptions !== null && currentOptions.length > 0)}
            />
          </div>
        </div>
      )}

      {isGenerating && !erroGeracao && <LoadingOverlay text={loadingText} />}
      {erroGeracao && <ErrorOverlay onRetry={retryGerar} />}
    </div>
  );
}

import { PrivateRoute } from "@/components/PrivateRoute";

export const Route = createFileRoute("/consulta")({
  component: () => (
    <PrivateRoute>
      <ConsultaGuard>
        <ConsultaPage />
      </ConsultaGuard>
    </PrivateRoute>
  ),
});
