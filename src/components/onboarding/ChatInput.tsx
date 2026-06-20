import { Send } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-3 sm:px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t bg-white"
      style={{ borderColor: "#F3E8F0" }}
    >
      <textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Digite sua resposta..."
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="sentences"
        className="flex-1 px-4 py-3 rounded-2xl border bg-white text-base focus:outline-none focus:ring-2 disabled:opacity-50 leading-snug"
        style={{
          borderColor: "#F3E8F0",
          color: "#1A0010",
          resize: "none",
          overflowY: "hidden",
          maxHeight: 120,
          fontSize: "16px",
        }}
        aria-label="Sua resposta"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Enviar"
        className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-40 active:scale-95"
        style={{ background: "#552736" }}
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
