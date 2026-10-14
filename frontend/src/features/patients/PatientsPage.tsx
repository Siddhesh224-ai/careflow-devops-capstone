import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  History,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessNotice,
} from "../../components/ui/States";
import type { Patient, PatientInput } from "../../lib/types";
import { patientApi } from "./api";
import { PatientForm } from "./PatientForm";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function PatientsPage() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Patient | null | undefined>(undefined),
    [deleting, setDeleting] = useState<Patient | null>(null),
    [historyPatient, setHistoryPatient] = useState<Patient | null>(null),
    [notice, setNotice] = useState("");
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["patient-appointments", historyPatient?.id],
    queryFn: () => patientApi.appointments(historyPatient!.id),
    enabled: !!historyPatient,
  });
  const query = useQuery({
    queryKey: ["patients", page, search],
    queryFn: () => patientApi.list(page, search),
  });
  const save = useMutation({
    mutationFn: ({
      patient,
      input,
    }: {
      patient?: Patient;
      input: PatientInput;
    }) =>
      patient ? patientApi.update(patient.id, input) : patientApi.create(input),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["patients"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      setNotice(
        variables.patient
          ? "Patient details updated."
          : "Patient registered successfully.",
      );
      setEditing(undefined);
    },
  });
  const remove = useMutation({
    mutationFn: patientApi.remove,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patients"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      setNotice("Patient deleted.");
      setDeleting(null);
    },
  });
  return (
    <div className="space-y-6">
      <PageIntro
        title="Patients"
        description="Register patients and keep contact information current."
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} /> Add patient
          </Button>
        }
      />
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <label className="relative max-w-sm flex-1">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <span className="sr-only">Search patients</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="field pl-10"
              placeholder="Search by name or phone…"
            />
          </label>
          <span className="text-xs text-slate-500">
            {query.data?.total ?? 0} patient records
          </span>
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
            title={search ? "No matching patients" : "No patients yet"}
            description={
              search
                ? "Try adjusting your search."
                : "Register the first patient to begin managing clinic appointments."
            }
            action={
              !search && (
                <Button onClick={() => setEditing(null)}>
                  Register patient
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="table-cell">Patient</th>
                    <th className="table-cell">Contact</th>
                    <th className="table-cell">Date of birth</th>
                    <th className="table-cell">Registered</th>
                    <th className="table-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {query.data.items.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/70">
                      <td className="table-cell">
                        <div className="font-medium">{patient.full_name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {patient.gender || "Gender not specified"}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>{patient.phone_number}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {patient.email || "No email"}
                        </div>
                      </td>
                      <td className="table-cell text-slate-600">
                        {new Date(
                          `${patient.date_of_birth}T12:00:00`,
                        ).toLocaleDateString()}
                      </td>
                      <td className="table-cell text-slate-600">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setHistoryPatient(patient)}
                            className="rounded-lg p-2 text-brand-700 hover:bg-brand-50"
                            aria-label={`View ${patient.full_name} appointment history`}
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={() => setEditing(patient)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label={`Edit ${patient.full_name}`}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleting(patient)}
                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                            aria-label={`Delete ${patient.full_name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-slate-500">
                Page {query.data.page} of {Math.max(1, query.data.total_pages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-9 px-3"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 px-3"
                  disabled={page >= query.data.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <Dialog
        open={editing !== undefined}
        title={editing ? "Edit patient" : "Register patient"}
        description="Store only the contact information needed for clinic operations."
        onClose={() => setEditing(undefined)}
      >
        <PatientForm
          patient={editing || undefined}
          busy={save.isPending}
          apiError={save.error?.message}
          onCancel={() => setEditing(undefined)}
          onSubmit={(input) =>
            save.mutate({ patient: editing || undefined, input })
          }
        />
      </Dialog>
      <Dialog
        open={!!historyPatient}
        title={`${historyPatient?.full_name || "Patient"} · appointment history`}
        description="Previous and upcoming visits retained for this patient."
        onClose={() => setHistoryPatient(null)}
      >
        <div className="p-6">
          {history.isLoading ? <LoadingState rows={3} /> : history.isError ? <ErrorState message={history.error.message} retry={() => history.refetch()} /> : !history.data?.length ? (
            <p className="py-8 text-center text-sm text-slate-500">No appointment history.</p>
          ) : (
            <div className="space-y-3">{history.data.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                <div><div className="font-medium">{new Date(item.scheduled_at).toLocaleString()}</div><div className="text-sm text-slate-500">{item.doctor.full_name} · {item.reason}</div></div>
                <StatusBadge status={item.status} />
              </div>
            ))}</div>
          )}
        </div>
      </Dialog>
      <Dialog
        open={!!deleting}
        title="Delete patient?"
        description="This action is only allowed when no appointment history exists."
        onClose={() => setDeleting(null)}
      >
        <div className="p-6">
          <p className="text-sm text-slate-600">
            You are about to delete <b>{deleting?.full_name}</b>. This cannot be
            undone.
          </p>
          {remove.error && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {remove.error.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep patient
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {remove.isPending ? "Deleting…" : "Delete patient"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
