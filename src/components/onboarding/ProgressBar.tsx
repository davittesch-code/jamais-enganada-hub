interface ProgressBarProps {
  percent: number;
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full bg-white border-b" style={{ borderColor: "#F3E8F0" }}>
      <div className="relative w-full h-1.5" style={{ background: "#F3E8F0" }}>
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${clamped}%`,
            background: "#552736",
            transition: "width 300ms ease",
          }}
        />
      </div>
      <div
        className="text-[11px] text-right px-3 py-1"
        style={{ color: "#6B0F4B" }}
      >
        {clamped}% concluído
      </div>
    </div>
  );
}
