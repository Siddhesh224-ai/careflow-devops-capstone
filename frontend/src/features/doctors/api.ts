import { api, queryString } from "../../lib/api-client";
import type { Doctor, DoctorCreateInput, DoctorInput, Paginated } from "../../lib/types";

export const doctorApi = {
  list: (page = 1, search = "", pageSize = 20) =>
    api<Paginated<Doctor>>(
      `/doctors?${queryString({ page, page_size: pageSize, search })}`,
    ),
  create: (input: DoctorCreateInput) =>
    api<Doctor>("/doctors", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: DoctorInput) =>
    api<Doctor>(`/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => api<void>(`/doctors/${id}`, { method: "DELETE" }),
};
