import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { InlineLoading } from "../../components/ui/States";
import type { UserRole } from "../../lib/types";
import { useAuth } from "./AuthProvider";

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8"><InlineLoading /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={user.role === "DOCTOR" ? "/doctor" : "/"} replace />;
  return children;
}
