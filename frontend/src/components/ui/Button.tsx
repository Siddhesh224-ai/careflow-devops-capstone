import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
};

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 border-transparent",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
  danger: "bg-rose-600 text-white hover:bg-rose-700 border-transparent",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
