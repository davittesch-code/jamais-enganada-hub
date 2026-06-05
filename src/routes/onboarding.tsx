import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { ChatBubble } from "@/components/onboarding/ChatBubble";
import { TypingIndicator } from "@/components/onboarding/TypingIndicator";
import { ChatInput } from "@/components/onboarding/ChatInput";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useOnboarding } from "@/components/onboarding/useOnboarding";

function OnboardingPage() {
  const { messages, isTyping, progress, isComplete, handleUserReply, inputDisabled } =
    useOnboarding();
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isComplete]);

  return (
    <div
      className="flex flex-col h-dvh w-full"
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
          {isComplete && (
            <div className="flex justify-center my-6">
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
          <ChatInput onSend={handleUserReply} disabled={inputDisabled || isComplete} />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <PrivateRoute>
      <OnboardingPage />
    </PrivateRoute>
  ),
});
