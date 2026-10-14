import { api } from "../../lib/api-client";
import type { Appointment, DoctorDashboard, TimeOff, WorkingHours, WorkingHoursInput } from "../../lib/types";

export const doctorPortalApi = {
  dashboard: () => api<DoctorDashboard>("/doctor/dashboard"),
  replaceWorkingHours: (entries: WorkingHoursInput[]) =>
    api<WorkingHours[]>("/doctor/working-hours", {
      method: "PUT",
      body: JSON.stringify({ entries }),
    }),
  addTimeOff: (input: { start_at: string; end_at: string; reason?: string }) =>
    api<TimeOff>("/doctor/time-off", { method: "POST", body: JSON.stringify(input) }),
  deleteTimeOff: (id: string) => api<void>(`/doctor/time-off/${id}`, { method: "DELETE" }),
  complete: (id: string) => api<Appointment>(`/doctor/appointments/${id}/complete`, { method: "PATCH" }),
};
