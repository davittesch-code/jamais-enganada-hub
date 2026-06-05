import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div
        className="flex h-dvh w-full items-center justify-center"
        style={{ background: "#FDF6F9", color: "#6B0F4B" }}
      >
        <p className="text-sm">Carregando…</p>
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
          borderTopColor: "#A8006E",
          animation: "consulta-spin 1s linear infinite",
        }}
      />
      <p className="text-base font-medium mb-2" style={{ color: "#6B0F4B" }}>
        Gerando seu perfil...
      </p>
      <p
        key={text}
        className="text-sm transition-opacity duration-500"
        style={{ color: "#A8006E", animation: "consulta-fade 500ms ease-out" }}
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

function ConsultaPage() {
  const {
    messages,
    isTyping,
    progress,
    currentOptions,
    inputDisabled,
    isGenerating,
    loadingText,
    handleReply,
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

      {!isGenerating && (
        <div className="sticky bottom-0">
          <div className="max-w-2xl mx-auto">
            {currentOptions && currentOptions.length > 0 && (
              <QuickReply
                options={currentOptions}
                onSelect={handleReply}
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

      {isGenerating && <LoadingOverlay text={loadingText} />}
    </div>
  );
}

export const Route = createFileRoute("/consulta")({
  component: () => (
    <ConsultaGuard>
      <ConsultaPage />
    </ConsultaGuard>
  ),
});
