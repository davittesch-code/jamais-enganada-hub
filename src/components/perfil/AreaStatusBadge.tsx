type Status = "ok" | "atencao" | "critico" | "nao_aplicavel";

const MAP: Record<Status, { bg: string; color: string; text: string }> = {
  ok: { bg: "#DCFCE7", color: "#16A34A", text: "✓ Situação ok" },
  atencao: { bg: "#FEF9C3", color: "#D97706", text: "⚠ Requer atenção" },
  critico: { bg: "#FEE2E2", color: "#DC2626", text: "⚡ Situação crítica" },
  nao_aplicavel: { bg: "#F3F4F6", color: "#6B7280", text: "Não se aplica" },
};

export function AreaStatusBadge({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP.nao_aplicavel;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.text}
    </span>
  );
}

export function statusBorderColor(status: Status) {
  return MAP[status]?.color ?? "#E5E7EB";
}
