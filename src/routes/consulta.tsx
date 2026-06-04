import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/consulta")({
  component: () => (
    <PrivateRoute>
      <Placeholder title="Consulta com IA" icon={<MessageCircle className="w-6 h-6" />} />
    </PrivateRoute>
  ),
});
