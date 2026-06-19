import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatBubble } from "@/components/onboarding/ChatBubble";
import { TypingIndicator } from "@/components/onboarding/TypingIndicator";
import { ChatInput } from "@/components/onboarding/ChatInput";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { QuickReply } from "@/components/consulta/QuickReply";
import { useConsulta } from "@/components/consulta/useConsulta";
import { ProgressoSalvoBadge } from "@/components/consulta/ProgressoSalvoBadge";
import { UpsellModal } from "@/components/UpsellModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageCircle, RotateCcw } from "lucide-react";

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

function EntradaConsulta({
  nome,
  geracoesRestantes,
  onRefazer,
  onVerPerfil,
}: {
  nome: string;
  geracoesRestantes: number;
  onRefazer: () => void;
  onVerPerfil: () => void;
}) {
  const nomeOk = nome || "amiga";
  return (
    <div className="flex-1 overflow-y-auto px-4 py-10">
      <div className="max-w-xl mx-auto text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
          style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #552736 100%)" }}>
          JE
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "#6B0F4B" }}>
          Você já tem seu perfil jurídico, {nomeOk}! 💜
        </h1>
        <p className="text-gray-600 mb-8">O que você gostaria de fazer agora?</p>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8D0E0] shadow-sm text-left">
          <div className="flex items-start gap-3 mb-3">
            <RotateCcw className="w-5 h-5 mt-1 shrink-0" style={{ color: "#6B0F4B" }} />
            <div>
              <h2 className="font-semibold text-lg" style={{ color: "#1A0010" }}>
                Refazer meu perfil
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Converse novamente com a Sofia e gere um perfil atualizado com novas informações.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Você tem <strong>{geracoesRestantes}</strong> de 2 gerações de perfil disponíveis.
          </p>
          <button
            onClick={onRefazer}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#552736] hover:bg-[#3F1C28] text-white px-6 py-3 rounded-full text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Conversar com a Sofia novamente
          </button>
        </div>

        <button
          onClick={onVerPerfil}
          className="mt-6 text-sm text-[#6B0F4B] hover:underline"
        >
          Ou veja seu perfil atual →
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
    currentExplicacao,
    currentNaoSeiLabel,
    inputDisabled,
    isGenerating,
    loadingText,
    handleReply,
    erroGeracao,
    retryGerar,
    savedFlash,
    entradaModo,
    nomeUsuaria,
    userEmail,
    userId,
    perfilGeracoesUsed,
    perfilGeracoesLimit,
    showUpsellPerfil,
    setShowUpsellPerfil,
    iniciarNovaConsulta,
  } = useConsulta();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const geracoesRestantes = Math.max(0, perfilGeracoesLimit - perfilGeracoesUsed);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, currentOptions]);

  const handleRefazerClick = () => {
    if (geracoesRestantes <= 0) {
      setShowUpsellPerfil(true);
      return;
    }
    setConfirmOpen(true);
  };

  if (entradaModo) {
    return (
      <div
        className="relative flex flex-col h-dvh w-full"
        style={{ background: "#FDF6F9" }}
      >
        <EntradaConsulta
          nome={nomeUsuaria}
          geracoesRestantes={geracoesRestantes}
          onRefazer={handleRefazerClick}
          onVerPerfil={() => navigate({ to: "/perfil" })}
        />

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso vai usar 1 das suas {geracoesRestantes} gerações de perfil restantes e
                seu perfil atual será substituído quando você concluir a nova conversa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false);
                  void iniciarNovaConsulta();
                }}
              >
                Sim, conversar novamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <UpsellModal
          open={showUpsellPerfil}
          onClose={() => setShowUpsellPerfil(false)}
          tipo="perfil"
          userEmail={userEmail || null}
          userId={userId || null}
          onRecargaConfirmada={async () => {
            setShowUpsellPerfil(false);
            // Após recarga, segue para confirmação
            setConfirmOpen(true);
          }}
        />
      </div>
    );
  }

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
                explicacao={currentExplicacao}
                naoSeiLabel={currentNaoSeiLabel}
                onNaoSei={
                  currentNaoSeiLabel
                    ? (label) => handleReply(label)
                    : undefined
                }
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
      <ProgressoSalvoBadge visible={savedFlash} />
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
