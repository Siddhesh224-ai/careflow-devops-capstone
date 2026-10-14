import { api } from "../../lib/api-client";
import type { DashboardSummary } from "../../lib/types";

export const getDashboard = () => api<DashboardSummary>("/dashboard/summary");
