"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AnalyzePayload, FraudResponse, ManualTransactionInput, TransactionRecord } from "@/types";

type PlatformContextType = {
  isAuthenticated: boolean;
  userEmail: string;
  feedTransactions: TransactionRecord[];
  historyTransactions: TransactionRecord[];
  aiStrictness: number;
  setAiStrictness: (n: number) => void;
  streamState: "idle" | "connecting" | "live" | "error";
  lastStreamLatencyMs?: number;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  analyze: (payload: AnalyzePayload) => Promise<TransactionRecord>;
  submitManualTransaction: (input: ManualTransactionInput) => Promise<TransactionRecord>;
  updateTransactionStatus: (txId: string, status: TransactionRecord["status"]) => void;
  filter: "all" | "fraud" | "safe";
  setFilter: (f: "all" | "fraud" | "safe") => void;
  latestFeed?: TransactionRecord;
  latestHistory?: TransactionRecord;
};

const PlatformContext = createContext<PlatformContextType | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [feedTransactions, setFeedTransactions] = useState<TransactionRecord[]>([]);
  const [historyTransactions, setHistoryTransactions] = useState<TransactionRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "fraud" | "safe">("all");
  const [aiStrictness, setAiStrictness] = useState(0.5);
  const [streamState, setStreamState] = useState<PlatformContextType["streamState"]>("idle");
  const [lastStreamLatencyMs, setLastStreamLatencyMs] = useState<number | undefined>(undefined);

  const apiBaseUrl = process.env.NEXT_PUBLIC_FRAUD_API_BASE_URL || "http://localhost:8000";

  const mapBackendTxToRecord = (backendTx: any): TransactionRecord => {
    const createdAt = String(backendTx.timestamp || backendTx.createdAt || new Date().toISOString());
    const created = new Date(createdAt);
    const hh = String(created.getHours()).padStart(2, "0");
    const mm = String(created.getMinutes()).padStart(2, "0");
    const time = `${hh}:${mm}`;

    const probability = typeof backendTx.probability === "number" ? backendTx.probability : undefined;
    const riskScore =
      typeof backendTx.risk_score === "number"
        ? backendTx.risk_score
        : typeof backendTx.risk === "number"
          ? backendTx.risk
          : Math.round((probability ?? 0) * 100);

    const reasonCodes: string[] = Array.isArray(backendTx.reason_codes)
      ? backendTx.reason_codes
      : Array.isArray(backendTx.reasons)
        ? backendTx.reasons
        : [];

    const status = backendTx.status as TransactionRecord["status"] | undefined;
    const fraud = Boolean(backendTx.is_high_risk ?? status === "blocked");

    const confidence = Math.max(50, Math.min(99, Math.round(((probability ?? riskScore / 100)) * 100)));

    return {
      id: String(backendTx.id ?? backendTx.txn_id ?? crypto.randomUUID()),
      txnId: backendTx.txn_id ? String(backendTx.txn_id) : undefined,
      createdAt,
      amount: Number(backendTx.amount ?? 0),
      location: String(backendTx.location ?? "Unknown"),
      device: String(backendTx.device ?? "Unknown device"),
      time,
      merchant: String(backendTx.merchant ?? "Unknown merchant"),

      fraud,
      risk: Math.max(1, Math.min(99, Math.round(riskScore))),
      confidence,
      reasons: reasonCodes,
      zScore: Number((((probability ?? 0.5) - 0.5) / 0.15).toFixed(2)),

      status: status ?? (fraud ? "blocked" : "approved"),
      probability,
      proofFileCount: 0,
    };
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let timeout: number | undefined;
    timeout = window.setTimeout(() => {
      setStreamState("connecting");
      setFeedTransactions([]);
    }, 0);

    const startedAt = performance.now();
    const es = new EventSource(`${apiBaseUrl}/api/transactions/stream?strictness=${encodeURIComponent(aiStrictness)}`);

    es.onopen = () => {
      // no-op: we measure latency on first message
    };

    es.onmessage = (event) => {
      const backendTx = JSON.parse(event.data) as any;
      const item = mapBackendTxToRecord(backendTx);
      setFeedTransactions((prev) => [item, ...prev].slice(0, 250));
      setStreamState("live");
      setLastStreamLatencyMs(Math.round(performance.now() - startedAt));
    };

    es.onerror = () => {
      setStreamState("error");
      try {
        es.close();
      } catch {
        // ignore
      }
    };

    return () => {
      if (timeout) window.clearTimeout(timeout);
      es.close();
    };
  }, [aiStrictness, isAuthenticated, apiBaseUrl]);

  const login = (email: string, password: string) => {
    if (!email || password.length < 4) return false;
    setAuthenticated(true);
    setUserEmail(email);
    return true;
  };

  const logout = () => {
    setAuthenticated(false);
    setUserEmail("");
    setFeedTransactions([]);
    setHistoryTransactions([]);
    setStreamState("idle");
    setLastStreamLatencyMs(undefined);
  };

  const analyze = async (payload: AnalyzePayload) => {
    const { proofs, ...rest } = payload;
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, proofs, userId: userEmail || "demo-user" }),
    });
    if (!response.ok) {
      throw new Error("Analysis failed");
    }
    const result = (await response.json()) as FraudResponse;
    const item: TransactionRecord = {
      ...rest,
      ...result,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      proofFileCount: proofs?.length ?? 0,
      txnId: rest.userId ? String(rest.userId) : undefined,
      status: result.fraud ? "blocked" : "approved",
    };
    setHistoryTransactions((prev) => [item, ...prev].slice(0, 200));
    return item;
  };

  const stableHash = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  };

  const submitManualTransaction = async (input: ManualTransactionInput) => {
    const payload = {
      ...input,
      strictness: aiStrictness,
    };

    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Backend submit failed");
      const backendTx = (await res.json()) as any;
      const item = mapBackendTxToRecord(backendTx);
      setHistoryTransactions((prev) => [item, ...prev].slice(0, 200));
      return item;
    } catch {
      const seed = stableHash(`${input.merchant}|${input.amount}|${input.location}|${input.device}|${input.timestamp ?? ""}`);
      const prob = ((seed % 10000) / 10000) * 0.7 + 0.15;
      const probability = Math.max(0, Math.min(0.99, prob));
      const riskScore = Math.max(1, Math.min(99, Math.round(probability * 100)));
      const isHigh = probability >= aiStrictness;

      const codes = [
        "unusual_location",
        "velocity_check_failed",
        "device_mismatch",
        "device_anomaly",
        "amount_zscore_high",
        "merchant_risk_high",
        "odd_transaction_time",
        "recent_chargeback_risk",
      ];
      const picked = codes.sort((a, b) => stableHash(a + seed) - stableHash(b + seed)).slice(0, 3);

      const createdAt = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();
      const created = new Date(createdAt);
      const hh = String(created.getHours()).padStart(2, "0");
      const mm = String(created.getMinutes()).padStart(2, "0");
      const time = `${hh}:${mm}`;

      const item: TransactionRecord = {
        id: crypto.randomUUID(),
        txnId: `manual_${crypto.randomUUID()}`,
        createdAt,
        amount: input.amount,
        location: input.location,
        device: input.device,
        time,
        merchant: input.merchant,
        fraud: isHigh,
        risk: riskScore,
        confidence: Math.max(50, Math.min(99, Math.round(probability * 100))),
        reasons: picked,
        zScore: Number((((probability ?? 0.5) - 0.5) / 0.15).toFixed(2)),
        status: isHigh ? "blocked" : "approved",
        probability,
        proofFileCount: 0,
      };

      setHistoryTransactions((prev) => [item, ...prev].slice(0, 200));
      return item;
    }
  };

  const updateTransactionStatus = (txId: string, status: TransactionRecord["status"]) => {
    const apply = (arr: TransactionRecord[]) =>
      arr.map((t) => {
        const match = t.id === txId || t.txnId === txId;
        if (!match) return t;
        const fraud = status === "blocked";
        return { ...t, status, fraud };
      });

    setFeedTransactions((prev) => apply(prev));
    setHistoryTransactions((prev) => apply(prev));
  };

  const value = {
    isAuthenticated,
    userEmail,
    feedTransactions,
    historyTransactions,
    aiStrictness,
    setAiStrictness,
    streamState,
    lastStreamLatencyMs,
    login,
    logout,
    analyze,
    submitManualTransaction,
    updateTransactionStatus,
    filter,
    setFilter,
    latestFeed: feedTransactions[0],
    latestHistory: historyTransactions[0],
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
