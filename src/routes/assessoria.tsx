import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/assessoria")({
  component: () => (
    <PrivateRoute>
      <Placeholder title="Assessoria jurídica" icon={<Briefcase className="w-6 h-6" />} />
    </PrivateRoute>
  ),
});
