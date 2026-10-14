import { api, queryString } from "../../lib/api-client";
import type { Appointment, Paginated, Patient, PatientInput } from "../../lib/types";

export const patientApi = {
  list: (page = 1, search = "", pageSize = 10) =>
    api<Paginated<Patient>>(
      `/patients?${queryString({ page, page_size: pageSize, search })}`,
    ),
  create: (input: PatientInput) =>
    api<Patient>("/patients", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: PatientInput) =>
    api<Patient>(`/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => api<void>(`/patients/${id}`, { method: "DELETE" }),
  appointments: (id: string) => api<Appointment[]>(`/patients/${id}/appointments`),
};
