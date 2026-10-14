import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarClock,
  Stethoscope,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ErrorState, InlineLoading } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getDashboard } from "./api";

const chartColors = ["#38bdf8", "#10b981", "#64748b", "#fb7185"];
const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  if (query.isLoading) return <InlineLoading />;
  if (query.isError)
    return (
      <div className="surface">
        <ErrorState
          message={query.error.message}
          retry={() => query.refetch()}
        />
      </div>
    );
  const data = query.data!;
  const stats = [
    {
      label: "Total patients",
      value: data.total_patients,
      icon: Users,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Active doctors",
      value: data.total_doctors,
      icon: Stethoscope,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Today's appointments",
      value: data.appointments_today,
      icon: CalendarCheck2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Upcoming",
      value: data.upcoming_appointments,
      icon: CalendarClock,
      tone: "bg-amber-50 text-amber-700",
    },
  ];
  const noData = data.total_patients === 0 && data.total_doctors === 0;
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand-700">Clinic overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Good day, team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Operations snapshot for{" "}
            {new Date(`${data.local_date}T12:00:00`).toLocaleDateString(
              undefined,
              { weekday: "long", month: "long", day: "numeric" },
            )}
            .
          </p>
        </div>
        <Link
          to="/appointments"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Schedule appointment
        </Link>
      </section>
      {noData && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-5">
          <h2 className="font-semibold text-brand-900">
            Set up your clinic workspace
          </h2>
          <p className="mt-1 text-sm text-brand-900/70">
            Start by registering a patient and adding a doctor, then schedule
            your first appointment.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              to="/patients"
              className="text-sm font-semibold text-brand-700 underline"
            >
              Register patient
            </Link>
            <Link
              to="/doctors"
              className="text-sm font-semibold text-brand-700 underline"
            >
              Add doctor
            </Link>
          </div>
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {label}
              </span>
              <span className={`rounded-lg p-2 ${tone}`}>
                <Icon size={18} />
              </span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight">
              {value}
            </div>
          </article>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.8fr)]">
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Today’s schedule</h2>
              <p className="text-xs text-slate-500">
                Appointments in clinic local time
              </p>
            </div>
            <Link
              to="/appointments"
              className="text-sm font-semibold text-brand-700"
            >
              View all
            </Link>
          </div>
          {data.todays_appointments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="table-cell">Patient</th>
                    <th className="table-cell">Doctor</th>
                    <th className="table-cell">Time</th>
                    <th className="table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.todays_appointments.map((item) => (
                    <tr key={item.id}>
                      <td className="table-cell font-medium">
                        {item.patient.full_name}
                      </td>
                      <td className="table-cell text-slate-600">
                        {item.doctor.full_name}
                      </td>
                      <td className="table-cell text-slate-600">
                        {dateTime.format(new Date(item.scheduled_at))}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No appointments are scheduled for today.
            </div>
          )}
        </div>
        <div className="surface p-5">
          <h2 className="font-semibold">Appointment mix</h2>
          <p className="mt-1 text-xs text-slate-500">
            Status distribution across all records
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.status_distribution}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {data.status_distribution.map((entry, i) => (
                    <Cell key={entry.status} fill={chartColors[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.status_distribution.map((item, i) => (
              <div
                key={item.status}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: chartColors[i] }}
                />
                {item.status.toLowerCase()} <b>{item.count}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="surface">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Recently registered</h2>
        </div>
        {data.recent_patients.length ? (
          <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
            {data.recent_patients.map((patient) => (
              <div key={patient.id} className="p-5">
                <div className="font-medium">{patient.full_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {patient.phone_number}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-wide text-slate-400">
                  Added {new Date(patient.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No patients have been registered yet.
          </div>
        )}
      </section>
    </div>
  );
}
