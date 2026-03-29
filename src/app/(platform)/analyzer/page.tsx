"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { usePlatform } from "@/components/platform-provider";
import { TransactionRecord } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AnalyzerPage() {
  const { analyze } = usePlatform();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransactionRecord | null>(null);
  const [form, setForm] = useState({
    amount: "240",
    location: "New York",
    device: "iPhone 15",
    time: "12:45",
    merchant: "Acme Retail",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 text-lg font-semibold">Transaction Analyzer</h2>
        <div className="space-y-3">
          {Object.entries(form).map(([key, value]) => (
            <Input
              key={key}
              value={value}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={key}
            />
          ))}
          <Button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const out = await analyze({
                  amount: Number(form.amount),
                  location: form.location,
                  device: form.device,
                  time: form.time,
                  merchant: form.merchant || undefined,
                });
                setResult(out);
              } finally {
                setLoading(false);
              }
            }}
            className="w-full gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Analyze Transaction
          </Button>
        </div>
      </div>

      <motion.div layout className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-lg font-semibold">Analysis Result</h3>
        {!result && <p className="text-sm text-slate-400">Run analysis to see live AI scoring.</p>}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {result.fraud ? (
                <ShieldAlert className="h-5 w-5 text-red-300" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              )}
              <p className={`font-semibold ${result.fraud ? "text-red-300" : "text-emerald-300"}`}>
                {result.fraud ? "Fraud" : "Safe"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">Risk Score {result.risk}</p>
              <div className="h-2 rounded-full bg-slate-700">
                <div
                  className={`h-2 rounded-full ${result.risk >= 65 ? "bg-red-400" : "bg-emerald-400"}`}
                  style={{ width: `${result.risk}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Confidence</p>
                <p className="text-lg font-semibold">{result.confidence}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Z-Score</p>
                <p className="text-lg font-semibold">{result.zScore}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-300">Explanation</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {result.reasons.map((reason, idx) => (
                  <li key={`${reason}-${idx}`} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
