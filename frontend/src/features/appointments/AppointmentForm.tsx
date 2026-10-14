import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  PatientInput,
} from "../../lib/types";
import { doctorApi } from "../doctors/api";
import { patientApi } from "../patients/api";

const schema = z.object({
  create_patient: z.boolean(),
  patient_id: z.string().optional(),
  new_patient_name: z.string().optional(),
  new_patient_date_of_birth: z.string().optional(),
  new_patient_phone: z.string().optional(),
  new_patient_email: z.string().optional(),
  new_patient_address: z.string().optional(),
  doctor_id: z.string().uuid("Select a doctor"),
  scheduled_at: z.string().min(1, "Date and time are required"),
  duration_minutes: z.coerce.number().min(15).max(240),
  reason: z.string().trim().min(2, "Reason is required").max(500),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"]),
}).superRefine((values, context) => {
  if (!values.create_patient && !z.string().uuid().safeParse(values.patient_id).success) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["patient_id"], message: "Select a patient" });
  }
  if (values.create_patient) {
    if (!values.new_patient_name || values.new_patient_name.trim().length < 2)
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["new_patient_name"], message: "Enter the patient's full name" });
    if (!values.new_patient_date_of_birth)
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["new_patient_date_of_birth"], message: "Date of birth is required" });
    if (!values.new_patient_phone || !/^[0-9+() .-]{7,30}$/.test(values.new_patient_phone))
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["new_patient_phone"], message: "Enter a valid phone number" });
    if (values.new_patient_email && !z.string().email().safeParse(values.new_patient_email).success)
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["new_patient_email"], message: "Enter a valid email" });
  }
});
type Values = z.infer<typeof schema>;
const localValue = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export type AppointmentSubmission = {
  appointment: AppointmentInput;
  newPatient?: PatientInput;
};

export function AppointmentForm({
  appointment,
  busy,
  apiError,
  onSubmit,
  onCancel,
}: {
  appointment?: Appointment;
  busy: boolean;
  apiError?: string;
  onSubmit: (input: AppointmentSubmission) => void;
  onCancel: () => void;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [createPatient, setCreatePatient] = useState(false);
  const patients = useQuery({
    queryKey: ["patients", "selector", patientSearch],
    queryFn: () => patientApi.list(1, patientSearch, 100),
  });
  const doctors = useQuery({
    queryKey: ["doctors", "selector"],
    queryFn: () => doctorApi.list(1, "", 100),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: appointment
      ? {
          create_patient: false,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          scheduled_at: localValue(appointment.scheduled_at),
          duration_minutes: appointment.duration_minutes,
          reason: appointment.reason,
          status: appointment.status,
        }
      : { duration_minutes: 30, status: "SCHEDULED", create_patient: false },
  });
  return (
    <form
      className="p-6"
      onSubmit={handleSubmit((v) => {
        const appointment: AppointmentInput = {
          patient_id: v.patient_id || "",
          doctor_id: v.doctor_id,
          scheduled_at: new Date(v.scheduled_at).toISOString(),
          duration_minutes: v.duration_minutes,
          reason: v.reason,
          status: v.status,
        };
        if (!v.create_patient) return onSubmit({ appointment });
        onSubmit({
          appointment,
          newPatient: {
            full_name: v.new_patient_name!.trim(),
            date_of_birth: v.new_patient_date_of_birth!,
            phone_number: v.new_patient_phone!,
            email: v.new_patient_email || undefined,
            address: v.new_patient_address || undefined,
          },
        });
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!appointment && (
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={createPatient} {...register("create_patient", { onChange: (e) => setCreatePatient(e.target.checked) })} />
            <span className="text-sm font-medium">This is a new patient</span>
          </label>
        )}
        {!createPatient ? (
          <div>
            <label><span className="label">Search patients</span><input className="field mb-2" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search by name or phone" /></label>
            <Field label="Patient" error={errors.patient_id?.message}>
              <select className="field" {...register("patient_id")}>
                <option value="">Select patient</option>
                {patients.data?.items.map((x) => <option key={x.id} value={x.id}>{x.full_name} · {x.phone_number}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-2">
            <Field label="Patient full name" error={errors.new_patient_name?.message}><input className="field" {...register("new_patient_name")} /></Field>
            <Field label="Date of birth" error={errors.new_patient_date_of_birth?.message}><input className="field" type="date" {...register("new_patient_date_of_birth")} /></Field>
            <Field label="Phone number" error={errors.new_patient_phone?.message}><input className="field" {...register("new_patient_phone")} /></Field>
            <Field label="Email (optional)" error={errors.new_patient_email?.message}><input className="field" type="email" {...register("new_patient_email")} /></Field>
            <div className="sm:col-span-2"><Field label="Address (optional)"><textarea className="field h-20 py-2" {...register("new_patient_address")} /></Field></div>
          </div>
        )}
        <Field label="Doctor" error={errors.doctor_id?.message}>
          <select className="field" {...register("doctor_id")}>
            <option value="">Select doctor</option>
            {doctors.data?.items.map((x) => (
              <option key={x.id} value={x.id} disabled={!x.is_available}>
                {x.full_name} · {x.specialization}
                {!x.is_available ? " (unavailable)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date and time" error={errors.scheduled_at?.message}>
          <input
            className="field"
            type="datetime-local"
            {...register("scheduled_at")}
          />
        </Field>
        <Field label="Duration" error={errors.duration_minutes?.message}>
          <select className="field" {...register("duration_minutes")}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">90 minutes</option>
            <option value="120">2 hours</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reason for visit" error={errors.reason?.message}>
            <textarea className="field h-24 py-2" {...register("reason")} />
          </Field>
        </div>
        {appointment && (
          <Field label="Status" error={errors.status?.message}>
            <select className="field" {...register("status")}>
              {(
                [
                  "SCHEDULED",
                  "CONFIRMED",
                  "COMPLETED",
                  "CANCELLED",
                ] as AppointmentStatus[]
              ).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {(patients.isError || doctors.isError) && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Patient or doctor options could not be loaded.
        </p>
      )}
      {apiError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {apiError}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={busy || patients.isLoading || doctors.isLoading}
        >
          {busy
            ? "Saving…"
            : appointment
              ? "Save appointment"
              : "Schedule appointment"}
        </Button>
      </div>
    </form>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}
