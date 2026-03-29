"use client";

import { useCallback, useState } from "react";
import { FileImage, Loader2, ShieldAlert, ShieldCheck, Trash2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { usePlatform } from "@/components/platform-provider";
import { TransactionRecord } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { filesToProofMeta, MAX_BYTES, MAX_FILES } from "@/lib/proof-client";
import { cn } from "@/lib/utils";
import { extractOcrFromFile } from "@/lib/ocr-client";

export default function AnalyzerPage() {
  const { analyze } = usePlatform();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransactionRecord | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const [form, setForm] = useState({
    amount: "240",
    location: "New York",
    device: "iPhone 15",
    time: "12:45",
    merchant: "Acme Retail",
  });

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setFiles((prev) => {
      const next = [...prev, ...Array.from(incoming)].filter((f) => f.size <= MAX_BYTES);
      return next.slice(0, MAX_FILES);
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <h2 className="mb-1 text-lg font-semibold">Transaction Analyzer</h2>
        <p className="mb-4 text-sm text-slate-400">
          Add behavioral fields, then attach screenshots or PDF receipts — we hash proofs client-side and fuse
          signals on the server.
        </p>
        <div className="space-y-3">
          {Object.entries(form).map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">{key}</label>
              <Input
                value={value}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={key}
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
              Proof & screenshots
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "relative rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center transition",
                dragOver && "border-indigo-400/60 bg-indigo-500/10",
              )}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-indigo-300" />
              <p className="text-sm font-medium text-slate-200">Drop files or browse</p>
              <p className="mt-1 text-xs text-slate-500">
                PNG, JPG, WebP, PDF — up to {MAX_FILES} files, {Math.round(MAX_BYTES / (1024 * 1024))}MB each
              </p>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileImage className="h-4 w-4 shrink-0 text-indigo-300" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {ocrStatus && <p className="mt-2 text-xs text-slate-400">{ocrStatus}</p>}
          </div>

          <Button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const proofs = files.length ? await filesToProofMeta(files) : undefined;
                const firstImage = files.find((f) => f.type.startsWith("image/"));
                setOcrStatus(firstImage ? "Running OCR on uploaded proof..." : "No image proof for OCR.");
                const ocr = firstImage ? await extractOcrFromFile(firstImage) : null;
                if (ocr?.text) {
                  setOcrStatus(`OCR complete (${ocr.confidence}% confidence).`);
                } else if (firstImage) {
                  setOcrStatus("OCR could not read text from image.");
                }
                const out = await analyze({
                  amount: Number(form.amount),
                  location: form.location,
                  device: form.device,
                  time: form.time,
                  merchant: form.merchant || undefined,
                  proofs,
                  ocrText: ocr?.text,
                  ocrConfidence: ocr?.confidence,
                  ocrMatchedFields: ocr?.matchedFields,
                });
                setResult(out);
              } finally {
                setLoading(false);
              }
            }}
            className="w-full gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Analyze transaction + proofs
          </Button>
        </div>
      </div>

      <motion.div layout className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-lg font-semibold">Analysis result</h3>
        {!result && <p className="text-sm text-slate-400">Run analysis to see fused behavioral + proof scoring.</p>}
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
              <p className="mb-1 text-xs text-slate-400">Risk score {result.risk}</p>
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
                <p className="text-slate-400">Z-score</p>
                <p className="text-lg font-semibold">{result.zScore}</p>
              </div>
            </div>

            {result.proofInsights && (
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-200/90">
                  Proof intelligence
                </p>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Files analyzed</span>
                  <span className="font-semibold text-white">{result.proofInsights.filesAnalyzed}</span>
                </div>
                <div className="mb-2 text-xs text-slate-400">Trust score (metadata + integrity)</div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${result.proofInsights.trustScore}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">{result.proofInsights.trustScore}/100</p>
              </div>
            )}
            {result.ocrInsights && (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-cyan-200/90">
                  OCR cross-check
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">OCR confidence</span>
                  <span className="font-semibold text-white">{result.ocrInsights.confidence ?? 0}%</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Matched fields</span>
                  <span className="font-semibold text-white">
                    {result.ocrInsights.matchedFields.length
                      ? result.ocrInsights.matchedFields.join(", ")
                      : "none"}
                  </span>
                </div>
              </div>
            )}

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
