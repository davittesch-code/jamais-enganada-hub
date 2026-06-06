import { createFileRoute } from "@tanstack/react-router";
import { PrivateRoute } from "@/components/PrivateRoute";
import { PainelAdvogadaDashboard } from "@/components/painel-advogada/Dashboard";

export const Route = createFileRoute("/painel-advogada")({
  component: () => (
    <PrivateRoute roles={["advogado", "super_admin"]}>
      <PainelAdvogadaDashboard />
    </PrivateRoute>
  ),
});
