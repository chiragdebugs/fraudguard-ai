import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "danger" | "warning" | "success" | "info" }) {
  const variantClass =
    variant === "danger"
      ? "border-red-400/25 bg-red-500/10 text-red-200"
      : variant === "warning"
        ? "border-yellow-400/25 bg-yellow-500/10 text-yellow-200"
        : variant === "success"
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
          : variant === "info"
            ? "border-blue-400/25 bg-blue-500/10 text-blue-200"
            : "border-white/10 bg-white/5 text-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        variantClass,
        className,
      )}
      {...props}
    />
  );
}

