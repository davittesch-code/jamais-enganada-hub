import type { ReactNode } from "react";

export function Placeholder({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        {icon && <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">{icon}</div>}
        <h1 className="font-display text-4xl font-semibold text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground leading-relaxed">
          {subtitle ?? "Em construção — próximo passo."}
        </p>
      </div>
    </div>
  );
}
