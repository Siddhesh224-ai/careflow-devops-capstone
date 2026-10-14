import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
