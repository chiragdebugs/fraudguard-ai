"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Clock,
  Activity,
  Search,
  CornerDownLeft,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { usePlatform } from "@/components/platform-provider";
import { Badge } from "@/components/ui/badge";
import { InvestigationDialog } from "@/components/investigation-dialog";
import { DisputeDialog } from "@/components/dispute-dialog";
import { cn } from "@/lib/utils";
import { TransactionRecord } from "@/types";

function riskBadgeVariant(risk: number) {
  if (risk >= 75) return "danger";
  if (risk >= 45) return "warning";
  return "success";
}

export default function DashboardPage() {
  const { transactions, streamState, lastStreamLatencyMs, aiStrictness } = usePlatform();
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  const last24 = useMemo(() => {
    const cutoff = now - 24 * 60 * 60 * 1000;
    return transactions.filter((t) => {
      const dt = new Date(t.createdAt).getTime();
      return Number.isFinite(dt) && dt >= cutoff;
    });
  }, [transactions, now]);

  const kpis = useMemo(() => {
    const total = last24.length;
    const blocked = last24.filter((t) => t.fraud || t.status === "blocked").length;
    const fraudRate = total ? (blocked / total) * 100 : 0;
    return {
      total,
      blocked,
      fraudRate,
      avgRisk: total ? Math.round(last24.reduce((a, t) => a + t.risk, 0) / total) : 0,
    };
  }, [last24]);

  const chartData = useMemo(() => {
    const cutoff = now - 24 * 60 * 60 * 1000;
    const start = new Date(cutoff);
    const startHour = new Date(start);
    startHour.setMinutes(0, 0, 0);

    const buckets: { label: string; volume: number; frauds: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(startHour.getTime() + i * 60 * 60 * 1000);
      const label = `${String(d.getHours()).padStart(2, "0")}:00`;
      buckets.push({ label, volume: 0, frauds: 0 });
    }

    const bucketIndex = (dt: Date) => Math.floor((dt.getTime() - startHour.getTime()) / (60 * 60 * 1000));

    for (const t of last24) {
      const dt = new Date(t.createdAt);
      const idx = bucketIndex(dt);
      if (idx < 0 || idx >= 24) continue;
      buckets[idx].volume += 1;
      if (t.fraud || t.status === "blocked") buckets[idx].frauds += 1;
    }

    return buckets;
  }, [last24, now]);

  const onRowClick = (tx: TransactionRecord) => {
    if (!tx.fraud && tx.status !== "blocked") return;
    setSelectedTx(tx);
    setInvestOpen(true);
  };

  const highRiskCount = useMemo(
    () => transactions.filter((t) => t.fraud || t.status === "blocked").length,
    [transactions],
  );

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-600/20 via-slate-900 to-cyan-600/20 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px]">
            <p className="text-sm text-slate-300">Real-Time Command Center</p>
            <h2 className="mt-1 text-2xl font-semibold">Credit card fraud detection, streaming live</h2>
            <p className="mt-2 text-sm text-slate-400">
              Strictness threshold: <span className="font-semibold text-slate-100">{aiStrictness.toFixed(2)}</span>. Higher = fewer blocks.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <Cpu className="h-4 w-4 text-indigo-300" />
            <div className="text-sm">
              <div className="font-semibold text-slate-100">System Status</div>
              <div className="text-xs text-slate-400">
                {streamState === "live"
                  ? `Operational • Low latency${typeof lastStreamLatencyMs === "number" ? ` (~${lastStreamLatencyMs}ms)` : ""}`
                  : streamState === "connecting"
                    ? "Connecting to transaction stream..."
                    : streamState === "error"
                      ? "Stream error. Please refresh."
                      : "Idle"}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-sm">Total Transactions</span>
            <Activity className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold">{kpis.total}</p>
          <p className="mt-1 text-xs text-slate-500">Last 24 hours</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-sm">Blocked Attempts</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-red-200">{kpis.blocked}</p>
          <p className="mt-1 text-xs text-slate-500">AI flagged</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-sm">Current Fraud Rate</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold">{kpis.fraudRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-500">Blocked / total</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-sm">High Risk Queue</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold">{highRiskCount}</p>
          <p className="mt-1 text-xs text-slate-500">Click to investigate</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Transaction volume vs fraud</p>
            <Badge variant="info">24h trend</Badge>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 18, left: -8, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <Line type="monotone" dataKey="volume" name="Volume" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="frauds" name="Fraud" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Live transaction feed</p>
              <p className="mt-1 text-xs text-slate-400">Click a High Risk row to open investigation.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
              <CornerDownLeft className="mb-1 inline h-3.5 w-3.5 text-indigo-300" />
              Streaming
            </div>
          </div>

          <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-950/90 text-slate-300">
                <tr>
                  <th className="p-3 text-left font-semibold">Txn ID</th>
                  <th className="p-3 text-left font-semibold">Timestamp</th>
                  <th className="p-3 text-left font-semibold">Merchant</th>
                  <th className="p-3 text-left font-semibold">Amount</th>
                  <th className="p-3 text-left font-semibold">Location</th>
                  <th className="p-3 text-left font-semibold">AI Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 60).map((tx) => {
                  const riskVariant = riskBadgeVariant(tx.risk);
                  const badgeText = tx.fraud || tx.status === "blocked" ? "High Risk" : "Safe";
                  return (
                    <tr
                      key={tx.txnId ?? tx.id}
                      onClick={() => onRowClick(tx)}
                      className={cn(
                        "cursor-pointer border-t border-white/5 transition hover:bg-white/5",
                        (tx.fraud || tx.status === "blocked") && "bg-red-500/5 hover:bg-red-500/10",
                      )}
                    >
                      <td className="p-3 font-medium text-slate-200">{tx.txnId ?? tx.id.slice(0, 10)}</td>
                      <td className="p-3 text-slate-300 text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-slate-200">{tx.merchant}</td>
                      <td className="p-3 font-semibold">${tx.amount.toFixed(2)}</td>
                      <td className="p-3 text-slate-300">{tx.location}</td>
                      <td className="p-3">
                        <Badge variant={riskVariant}>
                          {badgeText} • {tx.risk}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-sm text-slate-500">
                      Waiting for live stream…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <InvestigationDialog
        open={investOpen}
        onOpenChange={setInvestOpen}
        tx={selectedTx}
        onRequestProof={() => setDisputeOpen(true)}
      />

      <DisputeDialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        tx={selectedTx}
      />
    </div>
  );
}
