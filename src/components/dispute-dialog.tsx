"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, ShieldCheck, ShieldAlert, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionRecord } from "@/types";

type OcrExtract = {
  merchantName: string;
  date: string;
  totalAmount: number;
  confidence: number;
  extractedText: string;
};

function dateOnlyFromIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function DisputeDialog({
  open,
  onOpenChange,
  tx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: TransactionRecord | null;
}) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_FRAUD_API_BASE_URL || "http://localhost:8000";
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocr, setOcr] = useState<OcrExtract | null>(null);
  const [error, setError] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError("");
    setOcr(null);
    setFile(acceptedFiles[0] ?? null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: 8 * 1024 * 1024,
  });

  const matches = useMemo(() => {
    if (!tx || !ocr) return null;
    const merchantMatch = tx.merchant?.toLowerCase().trim() === ocr.merchantName.toLowerCase().trim();
    const amountMatch = Math.abs(Number(tx.amount) - Number(ocr.totalAmount)) <= 0.01;
    const dateMatch = dateOnlyFromIso(tx.createdAt) === ocr.date;
    return { merchantMatch, amountMatch, dateMatch };
  }, [tx, ocr]);

  const runOcr = useCallback(async () => {
    if (!file || !tx) return;
    setScanning(true);
    setError("");
    setOcr(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      // backend uses txId to “match a recent transaction”
      fd.append("txId", tx.txnId ?? tx.id);
      const res = await fetch(`${apiBaseUrl}/api/ocr/extract`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("OCR extract failed");
      setOcr((await res.json()) as OcrExtract);
    } catch (e: any) {
      // Fallback: keep the UI demo working without backend/OCR services.
      const fallback: OcrExtract = {
        merchantName: tx.merchant || "Unknown merchant",
        date: dateOnlyFromIso(tx.createdAt),
        totalAmount: Number(tx.amount.toFixed(2)),
        confidence: 62,
        extractedText: `Merchant: ${tx.merchant || "Unknown merchant"}\nDate: ${dateOnlyFromIso(tx.createdAt)}\nTotal: ${Number(tx.amount.toFixed(2)).toFixed(2)}\n`,
      };
      setOcr(fallback);
      setError(e?.message ?? "OCR service unavailable — using mocked extraction.");
    } finally {
      setScanning(false);
    }
  }, [apiBaseUrl, file, tx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customer Dispute & Proof Upload</DialogTitle>
          <DialogDescription>
            Upload a receipt screenshot/PDF. We simulate OCR extraction and compare merchant/date/amount to the flagged transaction.
          </DialogDescription>
        </DialogHeader>

        {!tx ? (
          <div className="mt-6 text-sm text-slate-400">Select a transaction first.</div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-sm font-semibold">Flagged transaction</p>
                <div className="space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Txn ID</span>
                    <span className="font-medium">{tx.txnId ?? tx.id.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Merchant</span>
                    <span className="text-right">{tx.merchant}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Amount</span>
                    <span className="font-medium">${tx.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Date</span>
                    <span>{dateOnlyFromIso(tx.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">AI Risk</span>
                    <span>
                      <Badge variant={tx.fraud ? "danger" : "success"}>{tx.risk}%</Badge>
                    </span>
                  </div>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={[
                  "relative flex min-h-[188px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition",
                  isDragActive ? "border-blue-400/70 bg-blue-500/10" : "border-white/15 bg-black/20 hover:bg-white/5",
                ].join(" ")}
              >
                <input {...getInputProps()} />
                <UploadCloud className="mb-2 h-8 w-8 text-blue-300" />
                <p className="text-sm font-medium text-slate-200">Drop receipt proof here</p>
                <p className="mt-1 text-xs text-slate-500">PNG/JPG/WebP or PDF — up to 8MB</p>
                {file && (
                  <div className="mt-3 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-xs text-slate-300">
                    Selected: <span className="font-medium text-slate-100">{file.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={runOcr}
                disabled={!file || scanning}
                className="gap-2"
              >
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {scanning ? "Scanning receipt..." : "Extract receipt data"}
              </Button>
              {error && <span className="text-xs text-red-300">{error}</span>}
              {!file && <span className="text-xs text-slate-500">Choose a file to begin.</span>}
            </div>

            {scanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4"
              >
                <p className="mb-2 text-sm font-medium text-blue-200">OCR engine running</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-blue-900/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
                    initial={{ width: "10%" }}
                    animate={{ width: ["20%", "70%", "100%"] }}
                    transition={{ duration: 2.0, ease: "easeInOut" }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-300">Simulated 2-second processing delay.</p>
              </motion.div>
            )}

            {ocr && matches && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-sm font-semibold">OCR match results</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400">Extracted from receipt</p>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-slate-300">Merchant: {ocr.merchantName}</p>
                      <p className="mt-1 text-slate-300">Date: {ocr.date}</p>
                      <p className="mt-1 text-slate-300">Total: ${ocr.totalAmount.toFixed(2)}</p>
                      <p className="mt-2 text-xs text-slate-500">OCR confidence: {ocr.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400">Comparison vs flagged txn</p>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Merchant match</span>
                        <span className="font-semibold text-right">
                          {matches.merchantMatch ? <ShieldCheck className="inline h-4 w-4 text-emerald-300" /> : <ShieldAlert className="inline h-4 w-4 text-yellow-300" />}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-slate-300">Amount match</span>
                        <span className="font-semibold text-right">
                          {matches.amountMatch ? <ShieldCheck className="inline h-4 w-4 text-emerald-300" /> : <ShieldAlert className="inline h-4 w-4 text-yellow-300" />}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-slate-300">Date match</span>
                        <span className="font-semibold text-right">
                          {matches.dateMatch ? <ShieldCheck className="inline h-4 w-4 text-emerald-300" /> : <ShieldAlert className="inline h-4 w-4 text-yellow-300" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Extracted receipt text</p>
                    <Badge variant="info">{ocr.confidence}% OCR</Badge>
                  </div>
                  <ScrollArea className="h-40">
                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-200">{ocr.extractedText}</pre>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

