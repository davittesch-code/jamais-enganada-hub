import { useState } from "react";

interface QuickReplyProps {
  options: string[];
  onSelect: (options: string[]) => void;
  disabled: boolean;
  multiSelect?: boolean;
  confirmLabel?: string;
}

export function QuickReply({
  options,
  onSelect,
  disabled,
  multiSelect = false,
  confirmLabel = "Confirmar",
}: QuickReplyProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const handleSingle = (opt: string) => {
    if (disabled || picked) return;
    setPicked(opt);
    onSelect([opt]);
  };

  const toggle = (opt: string) => {
    if (disabled) return;
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
  };

  const confirmMulti = () => {
    if (disabled || selected.length === 0) return;
    onSelect(selected);
  };

  if (!multiSelect) {
    return (
      <div className="flex flex-wrap gap-2 px-4 py-3 bg-transparent">
        {options.map((opt) => {
          const isPicked = picked === opt;
          const isDisabled = disabled || picked !== null;
          return (
            <button
              key={opt}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSingle(opt)}
              className="px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-60"
              style={{
                borderColor: "#552736",
                background: isPicked ? "#552736" : "#FFFFFF",
                color: isPicked ? "#FFFFFF" : "#552736",
                cursor: isDisabled ? "default" : "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-transparent">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSel = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt)}
              className="px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-60"
              style={{
                borderColor: "#A8006E",
                background: isSel ? "#A8006E" : "#FFFFFF",
                color: isSel ? "#FFFFFF" : "#A8006E",
                cursor: disabled ? "default" : "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400">
          {selected.length} selecionado{selected.length === 1 ? "" : "s"}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={confirmMulti}
            disabled={disabled}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: "#A8006E" }}
          >
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}
