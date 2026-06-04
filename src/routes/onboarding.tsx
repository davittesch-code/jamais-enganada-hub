import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <PrivateRoute>
      <Placeholder
        title="Boas-vindas"
        subtitle="Em breve, uma conversa acolhedora para começar sua jornada. Em construção — próximo passo."
        icon={<Sparkles className="w-6 h-6" />}
      />
    </PrivateRoute>
  ),
});
