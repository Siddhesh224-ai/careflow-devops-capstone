import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Clock3, Save, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ErrorState, InlineLoading, SuccessNotice } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { WorkingHoursInput } from "../../lib/types";
import { doctorPortalApi } from "./api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type DayState = { enabled: boolean; start_time: string; end_time: string };
const initialDays = (): DayState[] => days.map(() => ({ enabled: false, start_time: "09:00", end_time: "17:00" }));

export function DoctorDashboardPage() {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["doctor-dashboard"], queryFn: doctorPortalApi.dashboard });
  const [hours, setHours] = useState<DayState[]>(initialDays);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!query.data) return;
    const next = initialDays();
    query.data.working_hours.forEach((entry) => {
      if (!next[entry.day_of_week].enabled) {
        next[entry.day_of_week] = {
          enabled: true,
          start_time: entry.start_time.slice(0, 5),
          end_time: entry.end_time.slice(0, 5),
        };
      }
    });
    setHours(next);
  }, [query.data]);

  const refresh = async (message: string) => {
    await cache.invalidateQueries({ queryKey: ["doctor-dashboard"] });
    setNotice(message);
  };
  const saveHours = useMutation({
    mutationFn: (entries: WorkingHoursInput[]) => doctorPortalApi.replaceWorkingHours(entries),
    onSuccess: () => refresh("Working hours updated."),
  });
  const addTimeOff = useMutation({
    mutationFn: doctorPortalApi.addTimeOff,
    onSuccess: () => {
      setStartAt(""); setEndAt(""); setReason("");
      return refresh("Time off added.");
    },
  });
  const removeTimeOff = useMutation({ mutationFn: doctorPortalApi.deleteTimeOff, onSuccess: () => refresh("Time off removed.") });
  const complete = useMutation({ mutationFn: doctorPortalApi.complete, onSuccess: () => refresh("Appointment marked complete.") });

  if (query.isLoading) return <InlineLoading />;
  if (query.isError) return <div className="surface"><ErrorState message={query.error.message} retry={() => query.refetch()} /></div>;
  const data = query.data!;
  const error = saveHours.error || addTimeOff.error || removeTimeOff.error || complete.error;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-700">Doctor workspace</p>
        <h1 className="mt-1 text-2xl font-semibold">Welcome, {data.doctor.full_name}</h1>
        <p className="mt-1 text-sm text-slate-500">Review appointments and manage when patients may be scheduled.</p>
      </div>
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error.message}</p>}

      <section className="surface overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">My appointments</h2></div>
        {!data.appointments.length ? <p className="p-8 text-center text-sm text-slate-500">No appointments yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="table-cell">Date</th><th className="table-cell">Patient</th><th className="table-cell">Reason</th><th className="table-cell">Status</th><th className="table-cell text-right">Action</th></tr></thead>
              <tbody className="divide-y">{data.appointments.map((item) => {
                const canComplete = ["SCHEDULED", "CONFIRMED"].includes(item.status) && new Date(item.scheduled_at) <= new Date();
                return <tr key={item.id}>
                  <td className="table-cell"><div>{new Date(item.scheduled_at).toLocaleDateString()}</div><div className="text-xs text-slate-500">{new Date(item.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></td>
                  <td className="table-cell font-medium">{item.patient.full_name}</td>
                  <td className="table-cell max-w-xs truncate">{item.reason}</td>
                  <td className="table-cell"><StatusBadge status={item.status} /></td>
                  <td className="table-cell text-right">{canComplete && <Button className="h-9" disabled={complete.isPending} onClick={() => complete.mutate(item.id)}><CalendarCheck2 size={15}/> Mark complete</Button>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Weekly working hours</h2><p className="text-xs text-slate-500">Appointments must fit entirely inside one enabled window.</p></div><Clock3 className="text-brand-700" /></div>
          <div className="mt-5 space-y-3">{days.map((day, index) => (
            <div key={day} className="grid grid-cols-[120px_1fr_1fr] items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hours[index].enabled} onChange={(e) => setHours((current) => current.map((entry, i) => i === index ? { ...entry, enabled: e.target.checked } : entry))}/>{day}</label>
              <input aria-label={`${day} start`} className="field" type="time" disabled={!hours[index].enabled} value={hours[index].start_time} onChange={(e) => setHours((current) => current.map((entry, i) => i === index ? { ...entry, start_time: e.target.value } : entry))}/>
              <input aria-label={`${day} end`} className="field" type="time" disabled={!hours[index].enabled} value={hours[index].end_time} onChange={(e) => setHours((current) => current.map((entry, i) => i === index ? { ...entry, end_time: e.target.value } : entry))}/>
            </div>
          ))}</div>
          <Button className="mt-5" disabled={saveHours.isPending || !hours.some((x) => x.enabled)} onClick={() => saveHours.mutate(hours.flatMap((entry, day_of_week) => entry.enabled ? [{ day_of_week, start_time: entry.start_time, end_time: entry.end_time }] : []))}><Save size={16}/> Save working hours</Button>
        </div>

        <div className="surface p-5">
          <h2 className="font-semibold">Time off</h2>
          <p className="mt-1 text-xs text-slate-500">An overlapping appointment must be cancelled or rescheduled first.</p>
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); addTimeOff.mutate({ start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString(), reason: reason || undefined }); }}>
            <label><span className="label">From</span><input className="field" type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)}/></label>
            <label><span className="label">Until</span><input className="field" type="datetime-local" required value={endAt} onChange={(e) => setEndAt(e.target.value)}/></label>
            <label><span className="label">Reason (optional)</span><input className="field" maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)}/></label>
            <Button type="submit" disabled={addTimeOff.isPending || !startAt || !endAt}>Add time off</Button>
          </form>
          <div className="mt-6 space-y-2">{data.time_off.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div><div>{new Date(item.start_at).toLocaleString()} – {new Date(item.end_at).toLocaleString()}</div><div className="text-xs text-slate-500">{item.reason || "Unavailable"}</div></div>
              <button aria-label="Remove time off" className="rounded p-2 text-rose-600 hover:bg-rose-50" onClick={() => removeTimeOff.mutate(item.id)}><Trash2 size={16}/></button>
            </div>
          ))}</div>
        </div>
      </section>
    </div>
  );
}
