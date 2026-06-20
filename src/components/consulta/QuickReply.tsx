import { useState } from "react";

interface QuickReplyProps {
  options: string[];
  onSelect: (options: string[]) => void;
  disabled: boolean;
  multiSelect?: boolean;
  confirmLabel?: string;
  explicacao?: string;
  naoSeiLabel?: string;
  onNaoSei?: (label: string) => void;
}

export function QuickReply({
  options,
  onSelect,
  disabled,
  multiSelect = false,
  confirmLabel = "Confirmar",
  explicacao,
  naoSeiLabel,
  onNaoSei,
}: QuickReplyProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showExpl, setShowExpl] = useState(false);

  const effectiveNaoSei = naoSeiLabel ?? "Não sei";
  const showNaoSei = !!onNaoSei;

  const handleSingle = (opt: string) => {
    if (disabled || picked) return;
    setPicked(opt);
    onSelect([opt]);
  };

  const handleNaoSei = () => {
    if (disabled || picked) return;
    setPicked(effectiveNaoSei);
    onNaoSei?.(effectiveNaoSei);
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

  const helpButton = explicacao ? (
    <button
      type="button"
      onClick={() => setShowExpl((v) => !v)}
      aria-label="Ver explicação"
      className="inline-flex items-center justify-center text-[11px] font-bold rounded-full transition-all"
      style={{
        width: 18,
        height: 18,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#A8006E",
        color: "#A8006E",
        background: "#FFFFFF",
        lineHeight: 1,
      }}
    >
      ?
    </button>
  ) : null;

  const explBox =
    explicacao && showExpl ? (
      <div
        className="mb-3 text-sm text-gray-600 flex gap-2"
        style={{
          background: "#FDF6F9",
          borderLeft: "3px solid #A8006E",
          padding: "12px",
          borderRadius: "8px",
        }}
      >
        <span aria-hidden>⚖️</span>
        <span>{explicacao}</span>
      </div>
    ) : null;

  const naoSeiChip = showNaoSei ? (
    <button
      key="__naosei"
      type="button"
      disabled={disabled || picked !== null}
      onClick={handleNaoSei}
      className="px-4 min-h-[44px] rounded-full text-sm font-medium transition-all disabled:opacity-60 inline-flex items-center gap-1.5 active:scale-[0.98]"
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#9CA3AF",
        background: "#FFFFFF",
        color: "#6B7280",
        cursor: disabled || picked !== null ? "default" : "pointer",
      }}
    >
      <span style={{ fontWeight: 700 }}>?</span>
      <span>{effectiveNaoSei}</span>
    </button>
  ) : null;

  if (!multiSelect) {
    return (
      <div className="px-3 sm:px-4 py-3 bg-transparent">
        {(explicacao || showNaoSei) && (
          <div className="mb-2 flex items-center justify-end">{helpButton}</div>
        )}
        {explBox}
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isPicked = picked === opt;
            const isDisabled = disabled || picked !== null;
            return (
              <button
                key={opt}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSingle(opt)}
                className="px-4 min-h-[44px] rounded-full text-sm font-medium border transition-all disabled:opacity-60 active:scale-[0.98]"
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
          {naoSeiChip}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-3 bg-transparent">
      {(explicacao || showNaoSei) && (
        <div className="mb-2 flex items-center justify-end">{helpButton}</div>
      )}
      {explBox}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSel = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt)}
              className="px-4 min-h-[44px] rounded-full text-sm font-medium border transition-all disabled:opacity-60 active:scale-[0.98]"
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
        {naoSeiChip}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500">
          {selected.length} selecionado{selected.length === 1 ? "" : "s"}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={confirmMulti}
            disabled={disabled}
            className="px-5 min-h-[44px] rounded-full text-sm font-semibold text-white transition-all disabled:opacity-60 active:scale-[0.98]"
            style={{ background: "#A8006E" }}
          >
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}
