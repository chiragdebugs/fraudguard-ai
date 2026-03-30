"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, SlidersHorizontal, ShieldAlert, Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/components/platform-provider";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Rule Engine", icon: SlidersHorizontal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { userEmail, logout, transactions } = usePlatform();
  const router = useRouter();
  const alertCount = transactions.filter((t) => t.fraud).length;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <aside className="glass rounded-2xl p-4 shadow-glow">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/20 p-2">
              <ShieldAlert className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">FraudGuard AI</p>
              <p className="text-xs text-slate-400">Risk Intelligence Platform</p>
            </div>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const ActiveIcon = item.icon;
              const active = path === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
                    active ? "bg-indigo-500/20 text-indigo-100" : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <ActiveIcon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="mt-8 flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>
        <main className="glass rounded-2xl p-4 md:p-6 shadow-glow">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                placeholder="Search transactions..."
                className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm outline-none ring-indigo-400 transition focus:ring-2"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative rounded-xl border border-white/10 bg-black/20 p-2">
                <Bell className="h-4 w-4 text-slate-300" />
                {alertCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {alertCount}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200">
                {userEmail || "demo@fraudguard.ai"}
              </div>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
