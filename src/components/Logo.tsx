import { type CSSProperties } from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light";
  style?: CSSProperties;
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl md:text-5xl",
};

/**
 * Wordmark "Jamais Enganada".
 * "Jamais" em romano vinho-profundo, "Enganada" em it\u00e1lico magenta.
 * Na variante "light" (sobre fundos escuros), "Jamais" vira creme.
 */
export function Logo({ className = "", size = "md", variant = "default", style }: LogoProps) {
  const sizeClass = SIZE_MAP[size];
  const jamaisColor = variant === "light" ? "#FBF7F4" : "var(--vinho-profundo)";
  return (
    <span
      className={`font-display ${sizeClass} ${className}`}
      style={{ fontWeight: 500, letterSpacing: "-0.02em", ...style }}
      aria-label="Jamais Enganada"
    >
      <span style={{ color: jamaisColor }}>Jamais </span>
      <span style={{ color: "var(--magenta-acao)", fontStyle: "italic" }}>Enganada</span>
    </span>
  );
}

interface LogoMarkProps {
  size?: number;
  className?: string;
  variant?: "default" | "light" | "soft";
  style?: CSSProperties;
}

/**
 * Monograma "JE" circular para favicon, avatar da Sofia, app icon.
 * variant default: c\u00edrculo vinho com letras creme
 * variant light: c\u00edrculo creme com letras vinho (para fundos escuros)
 * variant soft: c\u00edrculo rosa-suave com letras vinho
 */
export function LogoMark({
  size = 40,
  className = "",
  variant = "default",
  style,
}: LogoMarkProps) {
  const palette = {
    default: { bg: "var(--vinho-profundo)", fg: "#FBF7F4" },
    light: { bg: "#FBF7F4", fg: "var(--vinho-profundo)" },
    soft: { bg: "var(--rosa-suave)", fg: "var(--vinho-profundo)" },
  }[variant];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: palette.bg,
        color: palette.fg,
        fontFamily: 'Fraunces, Georgia, serif',
        fontWeight: 500,
        fontSize: size * 0.4,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        boxShadow: "var(--elevacao-1)",
        ...style,
      }}
      aria-label="Jamais Enganada"
    >
      JE
    </span>
  );
}

export default Logo;
