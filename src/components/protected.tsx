"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatform } from "@/components/platform-provider";

export function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = usePlatform();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Verifying access...
      </div>
    );
  }

  return <>{children}</>;
}
