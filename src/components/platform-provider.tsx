"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AnalyzePayload, FraudResponse, TransactionRecord } from "@/types";

type PlatformContextType = {
  isAuthenticated: boolean;
  userEmail: string;
  transactions: TransactionRecord[];
  aiStrictness: number;
  setAiStrictness: (n: number) => void;
  streamState: "idle" | "connecting" | "live" | "error";
  lastStreamLatencyMs?: number;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  analyze: (payload: AnalyzePayload) => Promise<TransactionRecord>;
  ingestStreamTransaction: (t: TransactionRecord) => void;
  updateTransactionStatus: (txId: string, status: TransactionRecord["status"]) => void;
  filter: "all" | "fraud" | "safe";
  setFilter: (f: "all" | "fraud" | "safe") => void;
  latest?: TransactionRecord;
};

const PlatformContext = createContext<PlatformContextType | null>(null);

const seed: TransactionRecord[] = [
  {
    id: "tx-seed-1",
    amount: 189,
    device: "iPhone 15",
    location: "New York",
    merchant: "Acme Retail",
    time: "14:20",
    fraud: false,
    risk: 23,
    confidence: 77,
    reasons: ["Pattern aligns with historical normal behavior"],
    zScore: -0.61,
    proofFileCount: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "tx-seed-2",
    amount: 2240,
    device: "Unknown Tablet",
    location: "Moscow",
    merchant: "Crypto Fastlane",
    time: "03:05",
    fraud: true,
    risk: 86,
    confidence: 95,
    reasons: ["Amount anomaly detected", "Device anomaly", "Location anomaly"],
    zScore: 14.04,
    proofFileCount: 0,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [transactions, setTransactions] = useState<TransactionRecord[]>(seed);
  const [filter, setFilter] = useState<"all" | "fraud" | "safe">("all");
  const [aiStrictness, setAiStrictness] = useState(0.6);
  const [streamState, setStreamState] = useState<PlatformContextType["streamState"]>("idle");
  const [lastStreamLatencyMs, setLastStreamLatencyMs] = useState<number | undefined>(undefined);

  const apiBaseUrl = process.env.NEXT_PUBLIC_FRAUD_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    if (!isAuthenticated) return;
    let timeout: number | undefined;
    timeout = window.setTimeout(() => {
      setStreamState("connecting");
      setTransactions([]);
    }, 0);

    const startedAt = performance.now();
    const es = new EventSource(`${apiBaseUrl}/api/transactions/stream?strictness=${encodeURIComponent(aiStrictness)}`);
    let mockInterval: number | undefined;

    es.onopen = () => {
      // no-op: we measure latency on first message
    };

    es.onmessage = (event) => {
      const backendTx = JSON.parse(event.data) as any;

      // Map backend transaction to our UI shape.
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
      const isFraud = Boolean(backendTx.is_high_risk ?? status === "blocked");

      const item: TransactionRecord = {
        id: String(backendTx.id ?? backendTx.txn_id ?? crypto.randomUUID()),
        txnId: backendTx.txn_id ? String(backendTx.txn_id) : undefined,
        createdAt,
        amount: Number(backendTx.amount ?? 0),
        location: String(backendTx.location ?? "Unknown"),
        device: String(backendTx.device ?? "Unknown device"),
        time,
        merchant: String(backendTx.merchant ?? "Unknown merchant"),

        fraud: isFraud,
        risk: Math.max(1, Math.min(99, Math.round(riskScore))),
        confidence: Math.max(50, Math.min(99, Math.round((probability ?? (riskScore / 100)) * 100))),
        reasons: reasonCodes,
        zScore: Number((((probability ?? 0.5) - 0.5) / 0.15).toFixed(2)),

        status,
        probability,
        proofFileCount: 0,
      };

      setTransactions((prev) => [item, ...prev].slice(0, 250));
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

      // Fallback so the hackathon demo stays interactive even if backend isn't running.
      if (mockInterval) return;
      setTransactions([]);
      setStreamState("live");

      const merchants = ["Acme Retail", "Northwind Grocers", "Orbit Travel", "BrightMart Electronics", "Quanta Pharmacy", "Summit Fuel"];
      const locations = ["New York", "San Francisco", "London", "Berlin", "Toronto", "Mumbai", "Moscow", "Dubai"];
      const devices = ["iPhone 15", "Android Pixel 8", "Samsung Galaxy S23", "MacBook Pro", "Windows Laptop"];
      const reasonCodes = [
        "unusual_location",
        "velocity_check_failed",
        "device_mismatch",
        "device_anomaly",
        "amount_zscore_high",
        "merchant_risk_high",
        "odd_transaction_time",
        "recent_chargeback_risk",
      ];

      const tick = () => {
        const nowDt = new Date();
        const txId = `mock_${crypto.randomUUID()}`;

        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const device = devices[Math.floor(Math.random() * devices.length)];

        let amount = Math.round((Math.random() * 2200 + 15) * 100) / 100;
        // Outliers to make the UI exciting
        if (Math.random() < 0.12) amount = Math.round(amount * (2.5 + Math.random() * 2) * 100) / 100;

        const hour = nowDt.getHours();
        let probability = Math.random();
        if (amount > 900) probability = Math.min(0.99, probability + 0.25);
        if (["Moscow", "Dubai", "Mumbai"].includes(location)) probability = Math.min(0.99, probability + 0.18);
        if (hour < 5 || hour > 22) probability = Math.min(0.99, probability + 0.12);

        const riskScore = Math.max(1, Math.min(99, Math.round(probability * 100)));
        const isFraud = probability >= aiStrictness;

        // Pick 2-4 reasons
        const shuffled = [...reasonCodes].sort(() => Math.random() - 0.5);
        const count = 2 + Math.floor(Math.random() * 3);
        const picked = shuffled.slice(0, count);

        const hh = String(nowDt.getHours()).padStart(2, "0");
        const mm = String(nowDt.getMinutes()).padStart(2, "0");
        const time = `${hh}:${mm}`;

        const item: TransactionRecord = {
          id: String(txId),
          txnId: String(txId),
          createdAt: nowDt.toISOString(),
          amount,
          location,
          device,
          time,
          merchant,
          fraud: isFraud,
          risk: riskScore,
          confidence: Math.max(50, Math.min(99, Math.round(probability * 100))),
          reasons: picked,
          zScore: Number((((probability ?? 0.5) - 0.5) / 0.15).toFixed(2)),
          status: isFraud ? "blocked" : "approved",
          probability,
          proofFileCount: 0,
        };

        setTransactions((prev) => [item, ...prev].slice(0, 250));
        setLastStreamLatencyMs(Math.round(performance.now() - startedAt));
      };

      tick();
      mockInterval = window.setInterval(tick, 1200);
    };

    return () => {
      if (timeout) window.clearTimeout(timeout);
      if (mockInterval) window.clearInterval(mockInterval);
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
    setTransactions([]);
    setStreamState("idle");
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
    };
    setTransactions((prev) => [item, ...prev].slice(0, 100));
    return item;
  };

  const ingestStreamTransaction = (t: TransactionRecord) => {
    setTransactions((prev) => [t, ...prev].slice(0, 200));
  };

  const updateTransactionStatus = (txId: string, status: TransactionRecord["status"]) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txId || t.txnId === txId) return { ...t, status };
        return t;
      }),
    );
  };

  const value = {
    isAuthenticated,
    userEmail,
    transactions,
    aiStrictness,
    setAiStrictness,
    streamState,
    lastStreamLatencyMs,
    login,
    logout,
    analyze,
    ingestStreamTransaction,
    updateTransactionStatus,
    filter,
    setFilter,
    latest: transactions[0],
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
