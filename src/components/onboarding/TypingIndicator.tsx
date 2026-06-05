export function TypingIndicator() {
  return (
    <div className="flex w-full mb-3 justify-start">
      <div className="flex items-start gap-2 max-w-[75%]">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ background: "#F3E8F0" }}
          aria-hidden
        >
          💜
        </div>
        <div
          className="px-4 py-3 flex items-center gap-1.5"
          style={{
            background: "#6B0F4B",
            borderRadius: "18px 18px 18px 4px",
          }}
          aria-label="Sofia está digitando"
        >
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </div>
      </div>
      <style>{`
        @keyframes sofia-typing {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-white"
      style={{ animation: `sofia-typing 1.2s ease-in-out ${delay}ms infinite` }}
    />
  );
}
