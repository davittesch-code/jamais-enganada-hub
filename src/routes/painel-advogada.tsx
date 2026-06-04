import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/painel-advogada")({
  component: () => (
    <PrivateRoute roles={["advogado", "super_admin"]}>
      <Placeholder title="Painel da Advogada" icon={<Users className="w-6 h-6" />} />
    </PrivateRoute>
  ),
});
