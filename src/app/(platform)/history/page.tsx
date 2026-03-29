"use client";

import { useMemo } from "react";
import { usePlatform } from "@/components/platform-provider";

export default function HistoryPage() {
  const { transactions, filter, setFilter } = usePlatform();

  const filtered = useMemo(() => {
    if (filter === "fraud") return transactions.filter((t) => t.fraud);
    if (filter === "safe") return transactions.filter((t) => !t.fraud);
    return transactions;
  }, [transactions, filter]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transaction History</h2>
        <div className="flex gap-2">
          {(["all", "fraud", "safe"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                filter === item ? "bg-indigo-500/25 text-indigo-100" : "border border-white/10 text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[65vh] overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="p-3">Amount</th>
              <th className="p-3">Location</th>
              <th className="p-3">Device</th>
              <th className="p-3">Risk</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className={t.fraud ? "bg-red-500/5" : "bg-emerald-500/5"}>
                <td className="p-3">${t.amount}</td>
                <td className="p-3">{t.location}</td>
                <td className="p-3">{t.device}</td>
                <td className="p-3">{t.risk}</td>
                <td className={`p-3 ${t.fraud ? "text-red-300" : "text-emerald-300"}`}>
                  {t.fraud ? "Fraud" : "Safe"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
