"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shield, SlidersHorizontal } from "lucide-react";
import { usePlatform } from "@/components/platform-provider";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { aiStrictness, setAiStrictness, streamState, lastStreamLatencyMs } = usePlatform();
  const [value, setValue] = useState([aiStrictness]);

  const pretty = useMemo(() => {
    const v = value[0] ?? aiStrictness;
    return Math.round(v * 100);
  }, [aiStrictness, value]);

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-600/20 via-slate-900 to-cyan-600/20 p-5"
      >
        <p className="text-sm text-slate-300">AI Rule Engine</p>
        <h2 className="mt-1 text-2xl font-semibold">Global Strictness Threshold</h2>
        <p className="mt-2 text-sm text-slate-400">
          Tune how aggressively the model blocks transactions. Changes apply instantly to the live stream.
        </p>
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Strictness</p>
              <p className="mt-1 text-3xl font-semibold">
                {pretty}
                <span className="ml-2 text-sm font-medium text-slate-400">/ 100</span>
              </p>
            </div>
            <Badge variant="info">v{pretty / 100}</Badge>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>0.0 (more blocks)</span>
              <span>1.0 (fewer blocks)</span>
            </div>
            <div className="mt-3">
              <Slider
                value={value}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(v) => setValue(v)}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {streamState === "live" ? "Live stream connected." : streamState === "connecting" ? "Connecting to stream..." : "Idle"}
                {typeof lastStreamLatencyMs === "number" ? ` Latency: ~${lastStreamLatencyMs}ms` : ""}
              </div>
              <Button
                onClick={() => setAiStrictness(value[0] ?? aiStrictness)}
                className="gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-300" />
            <p className="text-sm font-semibold">How it works</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="rounded-xl border border-white/10 bg-black/25 p-3">
              Model returns a probability <span className="font-semibold text-slate-100">P(fraud)</span>.
            </li>
            <li className="rounded-xl border border-white/10 bg-black/25 p-3">
              If <span className="font-semibold text-slate-100">P(fraud) &gt;= threshold</span>, the system flags as high risk.
            </li>
            <li className="rounded-xl border border-white/10 bg-black/25 p-3">
              Higher threshold = stricter blocking (fewer false positives).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

