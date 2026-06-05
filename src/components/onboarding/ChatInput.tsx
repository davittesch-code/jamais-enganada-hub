import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-3 border-t bg-white"
      style={{ borderColor: "#F3E8F0" }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Digite sua resposta..."
        className="flex-1 px-4 py-2.5 rounded-full border bg-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
        style={{ borderColor: "#F3E8F0", color: "#1A0010" }}
        aria-label="Sua resposta"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Enviar"
        className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-40"
        style={{ background: "#A8006E" }}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
