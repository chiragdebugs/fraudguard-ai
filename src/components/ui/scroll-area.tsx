"use client";

import * as React from "react";

export function ScrollArea({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="h-full overflow-auto pr-2">{children}</div>
    </div>
  );
}

