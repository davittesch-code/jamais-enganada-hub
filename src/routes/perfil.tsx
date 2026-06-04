import { createFileRoute } from "@tanstack/react-router";
import { UserCircle } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/perfil")({
  component: () => (
    <PrivateRoute>
      <Placeholder title="Meu Perfil Jurídico" icon={<UserCircle className="w-6 h-6" />} />
    </PrivateRoute>
  ),
});
