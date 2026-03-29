"use client";

import { createContext, useContext, useState } from "react";
import { AnalyzePayload, FraudResponse, TransactionRecord } from "@/types";

type PlatformContextType = {
  isAuthenticated: boolean;
  userEmail: string;
  transactions: TransactionRecord[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  analyze: (payload: AnalyzePayload) => Promise<TransactionRecord>;
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

  const login = (email: string, password: string) => {
    if (!email || password.length < 4) return false;
    setAuthenticated(true);
    setUserEmail(email);
    return true;
  };

  const logout = () => {
    setAuthenticated(false);
    setUserEmail("");
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

  const value = {
    isAuthenticated,
    userEmail,
    transactions,
    login,
    logout,
    analyze,
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
