import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import type { Doctor, DoctorCreateInput, DoctorInput } from "../../lib/types";

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  specialization: z.string().trim().min(2, "Specialization is required"),
  phone_number: z
    .union([
      z.string().regex(/^[0-9+() .-]{7,30}$/, "Enter a valid phone"),
      z.literal(""),
    ])
    .optional(),
  email: z
    .union([z.string().email("Enter a valid email"), z.literal("")])
    .optional(),
  is_available: z.boolean(),
  username: z.string().min(3).max(80).optional(),
  password: z.string().min(8).max(128).optional(),
});
type Values = z.infer<typeof schema>;

export function DoctorForm({
  doctor,
  busy,
  apiError,
  onSubmit,
  onCancel,
}: {
  doctor?: Doctor;
  busy: boolean;
  apiError?: string;
  onSubmit: (input: DoctorInput | DoctorCreateInput) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: doctor
      ? {
          full_name: doctor.full_name,
          specialization: doctor.specialization,
          phone_number: doctor.phone_number ?? "",
          email: doctor.email ?? "",
          is_available: doctor.is_available,
        }
      : { is_available: true },
  });
  return (
    <form
      className="p-6"
      onSubmit={handleSubmit((v) => {
        const base: DoctorInput = {
          ...v,
          phone_number: v.phone_number || undefined,
          email: v.email || undefined,
        };
        delete (base as Partial<Values>).username;
        delete (base as Partial<Values>).password;
        if (doctor) return onSubmit(base);
        onSubmit({
          ...base,
          username: v.username!,
          password: v.password!,
          working_hours: [0, 1, 2, 3, 4].map((day_of_week) => ({ day_of_week, start_time: "09:00", end_time: "17:00" })),
        });
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Full name</span>
          <input className="field" {...register("full_name")} />
          {errors.full_name && (
            <span className="error-text">{errors.full_name.message}</span>
          )}
        </label>
        <label>
          <span className="label">Specialization</span>
          <input className="field" {...register("specialization")} />
          {errors.specialization && (
            <span className="error-text">{errors.specialization.message}</span>
          )}
        </label>
        <label>
          <span className="label">Phone (optional)</span>
          <input className="field" {...register("phone_number")} />
          {errors.phone_number && (
            <span className="error-text">{errors.phone_number.message}</span>
          )}
        </label>
        <label>
          <span className="label">Email (optional)</span>
          <input className="field" type="email" {...register("email")} />
          {errors.email && (
            <span className="error-text">{errors.email.message}</span>
          )}
        </label>
        <label className="flex items-center gap-3 sm:col-span-2">
          <input
            className="h-4 w-4 rounded text-brand-600"
            type="checkbox"
            {...register("is_available")}
          />
          <span className="text-sm font-medium">Available for scheduling</span>
        </label>
        {!doctor && (
          <>
            <label>
              <span className="label">Login username</span>
              <input className="field" autoComplete="off" required {...register("username")} />
              {errors.username && <span className="error-text">{errors.username.message}</span>}
            </label>
            <label>
              <span className="label">Temporary password</span>
              <input className="field" type="password" autoComplete="new-password" required {...register("password")} />
              {errors.password && <span className="error-text">{errors.password.message}</span>}
            </label>
            <p className="text-xs text-slate-500 sm:col-span-2">New doctors start with Monday–Friday, 09:00–17:00 working hours and can update them after signing in.</p>
          </>
        )}
      </div>
      {apiError && (
        <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {apiError}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : doctor ? "Save changes" : "Add doctor"}
        </Button>
      </div>
    </form>
  );
}
