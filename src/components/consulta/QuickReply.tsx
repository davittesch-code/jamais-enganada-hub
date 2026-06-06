import { useState } from "react";

interface QuickReplyProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled: boolean;
}

export function QuickReply({ options, onSelect, disabled }: QuickReplyProps) {
  const [picked, setPicked] = useState<string | null>(null);

  const handleClick = (opt: string) => {
    if (disabled || picked) return;
    setPicked(opt);
    onSelect(opt);
  };

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
            onClick={() => handleClick(opt)}
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
