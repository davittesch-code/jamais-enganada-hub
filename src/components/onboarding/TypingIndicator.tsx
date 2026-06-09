export function TypingIndicator() {
  return (
    <div className="flex w-full mb-3 justify-start">
      <div className="flex items-start gap-2 max-w-[75%]">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
          style={{ background: "#F3E8F0" }}
          aria-hidden
        >
          💜
        </div>
        <div className="flex flex-col items-start gap-1">
          <div
            className="px-4 py-3 flex items-center gap-1.5"
            style={{
              background: "#6B0F4B",
              borderRadius: "18px 18px 18px 4px",
            }}
            aria-label="Sofia está digitando"
          >
            <Dot delay={0} />
            <Dot delay={200} />
            <Dot delay={400} />
          </div>
          <span className="text-xs text-gray-400 italic pl-1">
            Sofia está digitando...
          </span>
        </div>
      </div>
      <style>{`
        @keyframes sofia-typing {
          0%, 100% { opacity: 0.7; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block rounded-full bg-white"
      style={{
        width: 8,
        height: 8,
        animation: `sofia-typing 1.2s ease-in-out ${delay}ms infinite`,
      }}
    />
  );
}
