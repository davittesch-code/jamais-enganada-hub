type Nivel = "alto" | "medio" | "baixo";

const MAP: Record<Nivel, { bg: string; color: string; label: string }> = {
  alto: { bg: "#FEE2E2", color: "#DC2626", label: "Alto" },
  medio: { bg: "#FEF9C3", color: "#D97706", label: "Médio" },
  baixo: { bg: "#DBEAFE", color: "#2563EB", label: "Baixo" },
};

export function NivelBadge({ nivel }: { nivel: Nivel }) {
  const s = MAP[nivel] ?? MAP.medio;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function nivelColor(nivel: Nivel) {
  return MAP[nivel]?.color ?? "#9CA3AF";
}
