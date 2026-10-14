import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Clock3, Edit3, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessNotice,
} from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
} from "../../lib/types";
import { PageIntro } from "../patients/PatientsPage";
import { appointmentApi } from "./api";
import { AppointmentForm } from "./AppointmentForm";
import type { AppointmentSubmission } from "./AppointmentForm";

const statuses: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

export function AppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | "">(""),
    [date, setDate] = useState(""),
    [editing, setEditing] = useState<Appointment | null | undefined>(undefined),
    [cancelling, setCancelling] = useState<Appointment | null>(null),
    [notice, setNotice] = useState("");
  const cache = useQueryClient(),
    query = useQuery({
      queryKey: ["appointments", status, date],
      queryFn: () =>
        appointmentApi.list(status || undefined, date || undefined),
    });
  const save = useMutation({
    mutationFn: ({
      item,
      input,
    }: {
      item?: Appointment;
      input: AppointmentSubmission;
    }) =>
      item
        ? appointmentApi.update(item.id, input.appointment)
        : input.newPatient
          ? appointmentApi.createWithNewPatient(input.newPatient, {
              doctor_id: input.appointment.doctor_id,
              scheduled_at: input.appointment.scheduled_at,
              duration_minutes: input.appointment.duration_minutes,
              reason: input.appointment.reason,
              status: input.appointment.status,
            })
          : appointmentApi.create(input.appointment),
    onSuccess: (_, variables) => {
      cache.invalidateQueries({ queryKey: ["appointments"] });
      cache.invalidateQueries({ queryKey: ["dashboard"] });
      setNotice(
        variables.item
          ? "Appointment updated."
          : "Appointment scheduled successfully.",
      );
      setEditing(undefined);
    },
  });
  const cancel = useMutation({
    mutationFn: appointmentApi.cancel,
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["appointments"] });
      cache.invalidateQueries({ queryKey: ["dashboard"] });
      setNotice("Appointment cancelled.");
      setCancelling(null);
    },
  });
  return (
    <div className="space-y-6">
      <PageIntro
        title="Appointments"
        description="Coordinate visits and protect each doctor’s schedule."
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} /> Schedule appointment
          </Button>
        }
      />
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <label>
            <span className="sr-only">Filter by date</span>
            <input
              className="field sm:w-44"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="field sm:w-44"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as AppointmentStatus | "")
              }
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {(status || date) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatus("");
                setDate("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState
            message={query.error.message}
            retry={() => query.refetch()}
          />
        ) : !query.data?.items.length ? (
          <EmptyState
            title="No appointments found"
            description={
              status || date
                ? "No visits match the selected filters."
                : "Schedule the first appointment after adding a patient and doctor."
            }
            action={
              !status &&
              !date && (
                <Button onClick={() => setEditing(null)}>
                  Schedule appointment
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="table-cell">Date & time</th>
                  <th className="table-cell">Patient</th>
                  <th className="table-cell">Doctor</th>
                  <th className="table-cell">Reason</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {query.data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="table-cell">
                      <div className="font-medium">
                        {new Date(item.scheduled_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Clock3 size={12} />
                        {new Date(item.scheduled_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {item.duration_minutes} min
                      </div>
                    </td>
                    <td className="table-cell font-medium">
                      {item.patient.full_name}
                    </td>
                    <td className="table-cell">
                      <div>{item.doctor.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {item.doctor.specialization}
                      </div>
                    </td>
                    <td className="table-cell max-w-[220px] truncate text-slate-600">
                      {item.reason}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button
                          disabled={
                            item.status === "COMPLETED" ||
                            item.status === "CANCELLED"
                          }
                          onClick={() => setEditing(item)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          aria-label="Edit appointment"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          disabled={
                            item.status === "COMPLETED" ||
                            item.status === "CANCELLED"
                          }
                          onClick={() => setCancelling(item)}
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                          aria-label="Cancel appointment"
                        >
                          <CalendarX2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog
        open={editing !== undefined}
        title={editing ? "Appointment details" : "Schedule appointment"}
        description={
          editing
            ? "Review or update this clinic visit."
            : "Times are stored in UTC and displayed in your local timezone."
        }
        onClose={() => setEditing(undefined)}
      >
        <AppointmentForm
          appointment={editing || undefined}
          busy={save.isPending}
          apiError={save.error?.message}
          onCancel={() => setEditing(undefined)}
          onSubmit={(input) =>
            save.mutate({ item: editing || undefined, input })
          }
        />
      </Dialog>
      <Dialog
        open={!!cancelling}
        title="Cancel appointment?"
        description="The record will remain in appointment history."
        onClose={() => setCancelling(null)}
      >
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Cancel the appointment for <b>{cancelling?.patient.full_name}</b>{" "}
            with <b>{cancelling?.doctor.full_name}</b>?
          </p>
          {cancel.error && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {cancel.error.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCancelling(null)}>
              Keep appointment
            </Button>
            <Button
              variant="danger"
              disabled={cancel.isPending}
              onClick={() => cancelling && cancel.mutate(cancelling.id)}
            >
              Cancel appointment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
