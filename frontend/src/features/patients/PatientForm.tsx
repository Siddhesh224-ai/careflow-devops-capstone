import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import type { Patient, PatientInput } from "../../lib/types";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the patient’s full name").max(120),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      (v) => new Date(v) <= new Date(),
      "Date of birth cannot be in the future",
    ),
  gender: z.string().max(30).optional(),
  phone_number: z
    .string()
    .regex(/^[0-9+() .-]{7,30}$/, "Enter a valid phone number"),
  email: z
    .union([z.string().email("Enter a valid email"), z.literal("")])
    .optional(),
  address: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

export function PatientForm({
  patient,
  busy,
  apiError,
  onSubmit,
  onCancel,
}: {
  patient?: Patient;
  busy: boolean;
  apiError?: string;
  onSubmit: (input: PatientInput) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: patient
      ? {
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth,
          gender: patient.gender ?? "",
          phone_number: patient.phone_number,
          email: patient.email ?? "",
          address: patient.address ?? "",
        }
      : {},
  });
  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          ...values,
          email: values.email || undefined,
          gender: values.gender || undefined,
          address: values.address || undefined,
        }),
      )}
      className="p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.full_name?.message}>
          <input className="field" {...register("full_name")} />
        </Field>
        <Field label="Date of birth" error={errors.date_of_birth?.message}>
          <input className="field" type="date" {...register("date_of_birth")} />
        </Field>
        <Field label="Gender (optional)" error={errors.gender?.message}>
          <select className="field" {...register("gender")}>
            <option value="">Not specified</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Phone number" error={errors.phone_number?.message}>
          <input className="field" type="tel" {...register("phone_number")} />
        </Field>
        <Field label="Email (optional)" error={errors.email?.message}>
          <input className="field" type="email" {...register("email")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address (optional)" error={errors.address?.message}>
            <textarea className="field h-24 py-2" {...register("address")} />
          </Field>
        </div>
      </div>
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
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : patient ? "Save changes" : "Register patient"}
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
