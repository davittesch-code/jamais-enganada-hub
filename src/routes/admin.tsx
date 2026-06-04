import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin")({
  component: () => (
    <PrivateRoute roles={["super_admin"]}>
      <Placeholder title="Painel Super Admin" icon={<ShieldCheck className="w-6 h-6" />} />
    </PrivateRoute>
  ),
});
