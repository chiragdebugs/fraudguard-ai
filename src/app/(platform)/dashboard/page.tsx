"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Clock,
  Activity,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TransactionRecord } from "@/types";

function riskBadgeVariant(risk: number) {
  if (risk >= 75) return "danger";
  if (risk >= 45) return "warning";
  return "success";
}

export default function DashboardPage() {
  const {
    feedTransactions,
    historyTransactions,
    submitManualTransaction,
    streamState,
    lastStreamLatencyMs,
    aiStrictness,
  } = usePlatform();
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  const combined = useMemo(() => {
    const all = [...feedTransactions, ...historyTransactions];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [feedTransactions, historyTransactions]);

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [device, setDevice] = useState("");
  const [timestampLocal, setTimestampLocal] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const last24 = useMemo(() => {
    const cutoff = now - 24 * 60 * 60 * 1000;
    return combined.filter((t) => {
      const dt = new Date(t.createdAt).getTime();
      return Number.isFinite(dt) && dt >= cutoff;
    });
  }, [combined, now]);

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

  const highRiskCount = useMemo(() => combined.filter((t) => t.fraud || t.status === "blocked").length, [combined]);

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

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-2xl p-5">
          <p className="mb-1 text-sm font-semibold text-slate-200">Add transaction to your History</p>
          <p className="mb-4 text-xs text-slate-400">
            No prefilled inputs. Whatever you type here will appear in History.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Merchant</label>
              <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Acme Retail" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Amount</label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 240.50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New York" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Device</label>
              <Input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. iPhone 15" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Timestamp (optional)</label>
            <Input type="datetime-local" value={timestampLocal} onChange={(e) => setTimestampLocal(e.target.value)} />
          </div>
          {submitError && <p className="mt-3 text-xs text-red-300">{submitError}</p>}
          <div className="mt-4">
            <Button
              disabled={submitting || !merchant || !amount || !location || !device || Number.isNaN(Number(amount))}
              onClick={async () => {
                setSubmitError("");
                setSubmitting(true);
                try {
                  const iso = timestampLocal ? new Date(timestampLocal).toISOString() : undefined;
                  const out = await submitManualTransaction({
                    merchant: merchant.trim(),
                    amount: Number(amount),
                    location: location.trim(),
                    device: device.trim(),
                    timestamp: iso,
                  });

                  // Auto-open investigation if blocked/high risk
                  if (out.fraud || out.status === "blocked") {
                    setSelectedTx(out);
                    setInvestOpen(true);
                  }

                  setMerchant("");
                  setAmount("");
                  setLocation("");
                  setDevice("");
                  setTimestampLocal("");
                } catch (e: any) {
                  setSubmitError(e?.message ?? "Failed to submit transaction.");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full gap-2"
            >
              {submitting ? <CornerDownLeft className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
              Add to History
            </Button>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="mb-2 text-sm font-semibold text-slate-200">System status</p>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Stream</span>
              <span className="font-semibold text-slate-100">{streamState}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last latency</span>
              <span className="font-semibold text-slate-100">
                {typeof lastStreamLatencyMs === "number" ? `~${lastStreamLatencyMs}ms` : "—"}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Strictness threshold</p>
              <p className="mt-1 text-2xl font-semibold">{aiStrictness.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">Used for blocking decisions.</p>
            </div>
          </div>
        </div>
      </section>

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
                {combined.slice(0, 60).map((tx) => {
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
                {combined.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-sm text-slate-500">
                      No transactions yet. Add one to History (left) or wait for the live feed.
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
