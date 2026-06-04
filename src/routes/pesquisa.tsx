import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/pesquisa")({
  component: () => (
    <PrivateRoute>
      <Placeholder title="Tira-dúvidas jurídico" icon={<Search className="w-6 h-6" />} />
    </PrivateRoute>
  ),
});
