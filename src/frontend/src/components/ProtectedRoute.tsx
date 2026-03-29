import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { isFetching } = useActor();

  if (!isLoggedIn && isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" />;
  return <>{children}</>;
}
