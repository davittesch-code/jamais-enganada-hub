import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (profile?.role !== "admin") return <Navigate to="/perfil" />;
  return <AppLayout>{children}</AppLayout>;
}

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminGuard>
      <Outlet />
    </AdminGuard>
  ),
});
