import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Mail, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessNotice,
} from "../../components/ui/States";
import type { Doctor, DoctorCreateInput, DoctorInput } from "../../lib/types";
import { PageIntro } from "../patients/PatientsPage";
import { doctorApi } from "./api";
import { DoctorForm } from "./DoctorForm";

export function DoctorsPage() {
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Doctor | null | undefined>(undefined),
    [deleting, setDeleting] = useState<Doctor | null>(null),
    [notice, setNotice] = useState("");
  const cache = useQueryClient(),
    query = useQuery({
      queryKey: ["doctors", search],
      queryFn: () => doctorApi.list(1, search, 100),
    });
  const save = useMutation({
    mutationFn: ({ doctor, input }: { doctor?: Doctor; input: DoctorInput | DoctorCreateInput }) =>
      doctor ? doctorApi.update(doctor.id, input as DoctorInput) : doctorApi.create(input as DoctorCreateInput),
    onSuccess: (_, variables) => {
      cache.invalidateQueries({ queryKey: ["doctors"] });
      cache.invalidateQueries({ queryKey: ["dashboard"] });
      setNotice(
        variables.doctor
          ? "Doctor details updated."
          : "Doctor added successfully.",
      );
      setEditing(undefined);
    },
  });
  const remove = useMutation({
    mutationFn: doctorApi.remove,
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["doctors"] });
      setNotice("Doctor deleted.");
      setDeleting(null);
    },
  });
  return (
    <div className="space-y-6">
      <PageIntro
        title="Doctors"
        description="Manage the clinical team and scheduling availability."
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} /> Add doctor
          </Button>
        }
      />
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      <div className="surface overflow-hidden">
        <div className="border-b p-4">
          <label className="relative block max-w-sm">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <span className="sr-only">Search doctors</span>
            <input
              className="field pl-10"
              placeholder="Search name or specialization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
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
            title={
              search ? "No matching doctors" : "Build your doctor directory"
            }
            description={
              search
                ? "Try another name or specialization."
                : "Add a doctor before scheduling clinic appointments."
            }
            action={
              !search && (
                <Button onClick={() => setEditing(null)}>Add doctor</Button>
              )
            }
          />
        ) : (
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((doctor) => (
              <article key={doctor.id} className="bg-white p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700">
                    {doctor.full_name
                      .replace("Dr. ", "")
                      .split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${doctor.is_available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {doctor.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <h2 className="mt-4 font-semibold">{doctor.full_name}</h2>
                <p className="mt-0.5 text-sm text-brand-700">
                  {doctor.specialization}
                </p>
                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {doctor.phone_number || "No phone listed"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    {doctor.email || "No email listed"}
                  </div>
                </div>
                <div className="mt-5 flex gap-2 border-t pt-4">
                  <Button
                    variant="secondary"
                    className="h-9 flex-1"
                    onClick={() => setEditing(doctor)}
                  >
                    <Edit3 size={15} /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 px-3 text-rose-600"
                    onClick={() => setDeleting(doctor)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Dialog
        open={editing !== undefined}
        title={editing ? "Edit doctor" : "Add doctor"}
        onClose={() => setEditing(undefined)}
      >
        <DoctorForm
          doctor={editing || undefined}
          busy={save.isPending}
          apiError={save.error?.message}
          onCancel={() => setEditing(undefined)}
          onSubmit={(input) =>
            save.mutate({ doctor: editing || undefined, input })
          }
        />
      </Dialog>
      <Dialog
        open={!!deleting}
        title="Delete doctor?"
        description="Doctors with appointment history cannot be deleted."
        onClose={() => setDeleting(null)}
      >
        <div className="p-6">
          <p className="text-sm">
            Delete <b>{deleting?.full_name}</b> from the directory?
          </p>
          {remove.error && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {remove.error.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep doctor
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Delete doctor
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
