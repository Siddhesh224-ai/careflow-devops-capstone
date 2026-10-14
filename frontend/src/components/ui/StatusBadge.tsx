import type { AppointmentStatus } from "../../lib/types";

const appointmentStyles: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  COMPLETED: "bg-slate-100 text-slate-700 ring-slate-500/20",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${appointmentStyles[status]}`}
    >
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}
