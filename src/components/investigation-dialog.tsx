"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck, FileText, HandCoins } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionRecord } from "@/types";
import { toReasonDetail, toReasonTitle } from "@/lib/reason-catalog";
import { usePlatform } from "@/components/platform-provider";

function riskVariant(risk: number) {
  if (risk >= 75) return "danger";
  if (risk >= 45) return "warning";
  return "success";
}

export function InvestigationDialog({
  open,
  onOpenChange,
  tx,
  onRequestProof,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: TransactionRecord | null;
  onRequestProof: () => void;
}) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_FRAUD_API_BASE_URL || "http://localhost:8000";
  const { updateTransactionStatus } = usePlatform();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const riskBadge = useMemo(() => {
    const r = tx?.risk ?? 0;
    return riskVariant(r);
  }, [tx]);

  const act = async (action: "block" | "approve" | "request_proof") => {
    if (!tx) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${apiBaseUrl}/api/transactions/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txId: tx.txnId ?? tx.id, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      const out = await res.json();
      const status = out?.status as TransactionRecord["status"];
      if (status) updateTransactionStatus(String(tx.txnId ?? tx.id), status);
      if (action === "request_proof") onRequestProof();
      onOpenChange(false);
    } catch (e: any) {
      const fallbackStatus: TransactionRecord["status"] =
        action === "block" ? "blocked" : action === "approve" ? "approved" : "proof_requested";
      updateTransactionStatus(String(tx.txnId ?? tx.id), fallbackStatus);
      if (action === "request_proof") onRequestProof();
      setError(e?.message ?? "Backend unavailable — applied local action.");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Investigation</DialogTitle>
          <DialogDescription>Model decision breakdown for this transaction.</DialogDescription>
        </DialogHeader>

        {!tx ? (
          <div className="mt-6 text-sm text-slate-400">Select a transaction first.</div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-400">Transaction</p>
                  <p className="mt-1 truncate text-lg font-semibold">
                    {tx.merchant} • ${tx.amount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tx.location} • {tx.device} • {tx.createdAt}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <Badge variant={riskBadge}>
                    Risk {tx.risk}%
                  </Badge>
                  <p className="mt-1 text-xs text-slate-400">{tx.status ?? (tx.fraud ? "blocked" : "approved")}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
                  <span className="text-slate-400">Model probability</span>
                  <div className="mt-1 text-sm font-semibold">{(tx.probability ?? tx.risk / 100).toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
                  <span className="text-slate-400">Confidence</span>
                  <div className="mt-1 text-sm font-semibold">{tx.confidence}%</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-sm font-semibold">Decision breakdown</p>
              <div className="space-y-2">
                {tx.reasons.length ? (
                  tx.reasons.map((code, i) => (
                    <div key={`${code}-${i}`} className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{toReasonTitle(code)}</p>
                          <p className="mt-1 text-xs text-slate-400">{toReasonDetail(code)}</p>
                        </div>
                        <div className="shrink-0">
                          {code.includes("velocity") ? (
                            <FileText className="h-4 w-4 text-yellow-300" />
                          ) : code.includes("location") ? (
                            <HandCoins className="h-4 w-4 text-blue-300" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-indigo-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No reason codes provided.</p>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-300">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                onClick={() => act("block")}
                disabled={busy}
                className="gap-2 border border-red-400/30 bg-red-500/15 text-red-100 hover:bg-red-500/20"
              >
                <ShieldAlert className="h-4 w-4" />
                Block Card
              </Button>
              <Button onClick={() => act("approve")} disabled={busy} className="gap-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/20">
                <ShieldCheck className="h-4 w-4" />
                Approve Transaction
              </Button>
              <Button onClick={() => act("request_proof")} disabled={busy} className="gap-2 bg-blue-500/15 border border-blue-400/30 text-blue-100 hover:bg-blue-500/20">
                <FileText className="h-4 w-4" />
                Request Proof
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

