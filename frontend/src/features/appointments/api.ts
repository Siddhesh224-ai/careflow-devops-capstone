import { api, queryString } from "../../lib/api-client";
import type {
  Appointment,
  AppointmentDetailsInput,
  AppointmentInput,
  AppointmentStatus,
  Paginated,
  PatientInput,
} from "../../lib/types";

export const appointmentApi = {
  list: (status?: AppointmentStatus, fromDate?: string) =>
    api<Paginated<Appointment>>(
      `/appointments?${queryString({ page: 1, page_size: 50, status, from_date: fromDate })}`,
    ),
  create: (input: AppointmentInput) =>
    api<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createWithNewPatient: (patient: PatientInput, appointment: AppointmentDetailsInput) =>
    api<Appointment>("/appointments/with-new-patient", {
      method: "POST",
      body: JSON.stringify({ patient, appointment }),
    }),
  update: (id: string, input: AppointmentInput) =>
    api<Appointment>(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  cancel: (id: string) =>
    api<void>(`/appointments/${id}`, { method: "DELETE" }),
};
