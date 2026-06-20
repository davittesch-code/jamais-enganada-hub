import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { AppLayout } from "./AppLayout";

export function PrivateRoute({ children, roles }: { children: ReactNode; roles?: AppRole[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/perfil"} />;
  }

  return <AppLayout>{children}</AppLayout>;
}
