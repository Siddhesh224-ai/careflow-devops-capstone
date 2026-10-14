import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 p-5" aria-label="Loading">
      <div className="h-10 rounded-lg bg-slate-100" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export function InlineLoading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
      <LoaderCircle className="animate-spin" size={18} /> Loading clinic data…
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="rounded-xl bg-brand-50 p-3 text-brand-700">
        <Inbox size={22} />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <AlertCircle className="text-rose-500" />
      <h3 className="mt-3 font-semibold">Something went wrong</h3>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      {retry && (
        <Button variant="secondary" className="mt-4" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
    >
      {children}
    </div>
  );
}
