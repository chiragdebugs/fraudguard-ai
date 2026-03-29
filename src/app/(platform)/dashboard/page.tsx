"use client";

import { AlertTriangle, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { usePlatform } from "@/components/platform-provider";

function Kpi({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between text-slate-400">
        <span className="text-sm">{title}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { transactions } = usePlatform();
  const total = transactions.length;
  const fraudCount = transactions.filter((t) => t.fraud).length;
  const fraudRate = total ? ((fraudCount / total) * 100).toFixed(1) : "0.0";
  const avgRisk = total ? Math.round(transactions.reduce((a, t) => a + t.risk, 0) / total) : 0;
  const activeAlerts = transactions.filter((t) => t.risk >= 75).length;

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-600/20 via-slate-900 to-cyan-600/20 p-5"
      >
        <p className="text-sm text-slate-300">AI Fraud Intelligence</p>
        <h2 className="mt-1 text-2xl font-semibold">Live risk visibility across every transaction</h2>
      </motion.section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Total Transactions" value={String(total)} icon={Wallet} />
        <Kpi title="Fraud Rate" value={`${fraudRate}%`} icon={AlertTriangle} />
        <Kpi title="Avg Risk Score" value={`${avgRisk}`} icon={TrendingUp} />
        <Kpi title="Active Alerts" value={String(activeAlerts)} icon={ShieldCheck} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 font-medium">Real-time Activity Feed</h3>
          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {transactions.slice(0, 10).map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">${t.amount.toLocaleString()}</p>
                  <span className={`text-xs ${t.fraud ? "text-red-300" : "text-emerald-300"}`}>
                    {t.fraud ? "Fraud" : "Safe"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {t.location} • {t.device} • risk {t.risk}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 font-medium">Fraud Alerts</h3>
          <div className="space-y-2">
            {transactions
              .filter((t) => t.fraud)
              .slice(0, 6)
              .map((t) => (
                <div key={`alert-${t.id}`} className="rounded-xl border border-red-300/20 bg-red-500/10 p-3">
                  <p className="text-sm font-medium text-red-200">High-risk transaction detected</p>
                  <p className="text-xs text-red-100/80">
                    ${t.amount} at {t.merchant || "Unknown merchant"} • confidence {t.confidence}%
                  </p>
                </div>
              ))}
            {transactions.filter((t) => t.fraud).length === 0 && (
              <p className="text-sm text-slate-400">No active alerts right now.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
