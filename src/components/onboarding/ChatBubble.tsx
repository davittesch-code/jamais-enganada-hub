import { useEffect, useState } from "react";

interface ChatBubbleProps {
  sender: "sofia" | "user";
  message: string;
}

export function ChatBubble({ sender, message }: ChatBubbleProps) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10);
    return () => clearTimeout(t);
  }, []);

  const isSofia = sender === "sofia";

  return (
    <div
      className={`flex w-full mb-3 ${isSofia ? "justify-start" : "justify-end"}`}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 150ms ease-out, transform 150ms ease-out",
      }}
    >
      {isSofia ? (
        <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[75%]">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
            style={{ background: "#F3E8F0" }}
            aria-hidden
          >
            💜
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium mb-1" style={{ color: "#6B0F4B" }}>
              Sofia
            </span>
            <div
              className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={{
                background: "#6B0F4B",
                color: "#FFFFFF",
                borderRadius: "18px 18px 18px 4px",
              }}
            >
              {message}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div
            className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
            style={{
              background: "#F3E8F0",
              color: "#1A0010",
              borderRadius: "18px 18px 4px 18px",
            }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  );
}
