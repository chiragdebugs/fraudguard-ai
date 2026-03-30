"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { usePlatform } from "@/components/platform-provider";

export default function AnalyticsPage() {
  const { historyTransactions } = usePlatform();
  const trend = [...historyTransactions].reverse().slice(-12).map((t, i) => ({ name: `T${i + 1}`, risk: t.risk }));
  const grouped = [
    { label: "Fraud", value: historyTransactions.filter((t) => t.fraud).length },
    { label: "Safe", value: historyTransactions.filter((t) => !t.fraud).length },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 font-medium">Risk Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="risk" stroke="#818cf8" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 font-medium">Fraud vs Safe</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grouped}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass rounded-2xl p-4 xl:col-span-2">
        <h3 className="mb-3 font-medium">Distribution</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={grouped} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={110} label>
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
