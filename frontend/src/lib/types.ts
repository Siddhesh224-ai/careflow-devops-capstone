export type Paginated<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender?: string;
  phone_number: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
};
export type PatientInput = Omit<Patient, "id" | "created_at" | "updated_at">;

export type Doctor = {
  id: string;
  full_name: string;
  specialization: string;
  phone_number?: string;
  email?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  working_hours: WorkingHours[];
};
export type DoctorInput = Omit<Doctor, "id" | "created_at" | "updated_at" | "working_hours">;
export type DoctorCreateInput = DoctorInput & {
  username: string;
  password: string;
  working_hours: WorkingHoursInput[];
};

export type WorkingHoursInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};
export type WorkingHours = WorkingHoursInput & { id: string };
export type TimeOff = {
  id: string;
  doctor_id: string;
  start_at: string;
  end_at: string;
  reason?: string;
  created_at: string;
};

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";
export type Appointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  reason: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  patient: Pick<Patient, "id" | "full_name" | "phone_number" | "created_at">;
  doctor: Pick<Doctor, "id" | "full_name" | "specialization" | "is_available">;
};
export type AppointmentInput = Pick<
  Appointment,
  | "patient_id"
  | "doctor_id"
  | "scheduled_at"
  | "duration_minutes"
  | "reason"
  | "status"
>;
export type AppointmentDetailsInput = Omit<AppointmentInput, "patient_id">;

export type DashboardSummary = {
  local_date: string;
  total_patients: number;
  total_doctors: number;
  appointments_today: number;
  upcoming_appointments: number;
  status_distribution: { status: AppointmentStatus; count: number }[];
  todays_appointments: Appointment[];
  recent_patients: Pick<
    Patient,
    "id" | "full_name" | "phone_number" | "created_at"
  >[];
};

export type UserRole = "ADMIN" | "DOCTOR";
export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  doctor_id?: string;
};
export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: AuthUser;
};
export type DoctorDashboard = {
  doctor: Doctor;
  appointments: Appointment[];
  working_hours: WorkingHours[];
  time_off: TimeOff[];
};
