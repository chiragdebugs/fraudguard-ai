import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none ring-indigo-400 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
