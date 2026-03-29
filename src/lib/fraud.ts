import { AnalyzePayload, FraudResponse, ProofFileMeta } from "@/types";

const profile = {
  avgSpend: 275,
  stdSpend: 140,
  commonLocations: ["new york", "san francisco", "london"],
  knownDevices: ["iphone 15", "macbook pro", "windows laptop"],
  velocityWindowMinutes: 7,
  velocityThreshold: 3,
};

const txTimestamps = new Map<string, number[]>();

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const SUSPICIOUS_NAME = /fake|forg|photoshop|copy\s*\(|edited|screenshot\s*copy|test\s*receipt|sample\.png/i;

function analyzeProofs(proofs: ProofFileMeta[] | undefined) {
  const notes: string[] = [];
  let riskDelta = 0;
  let confidenceDelta = 0;
  let trustAccumulator = 50;

  if (!proofs || proofs.length === 0) {
    notes.push("No documentary proof attached — scoring uses behavioral signals only.");
    return {
      riskDelta: 0,
      confidenceDelta: -4,
      trustScore: 40,
      notes,
    };
  }

  notes.push(`${proofs.length} proof file(s) registered with integrity hashes for audit trail.`);
  trustAccumulator += 12;
  confidenceDelta += 6;

  const hashes = new Set<string>();
  for (const p of proofs) {
    if (hashes.has(p.sha256)) {
      riskDelta += 10;
      notes.push("Duplicate file hash detected — possible repeated upload.");
    }
    hashes.add(p.sha256);

    if (SUSPICIOUS_NAME.test(p.name)) {
      riskDelta += 14;
      notes.push(`Filename signal: "${p.name}" matches common tampering patterns.`);
    }

    if (p.sizeBytes < 2500) {
      riskDelta += 8;
      notes.push(`"${p.name}" is unusually small — verify it is a complete capture.`);
    } else {
      trustAccumulator += 4;
    }

    const allowed = /^image\/(jpeg|png|webp)$|^application\/pdf$/i;
    if (!allowed.test(p.mimeType)) {
      riskDelta += 9;
      notes.push(`Unexpected MIME type (${p.mimeType}) — expected receipt image or PDF.`);
    } else {
      trustAccumulator += 5;
    }

    if (p.imageWidth && p.imageHeight) {
      const { imageWidth: w, imageHeight: h } = p;
      const mobilePortrait = h > w && w >= 360 && w <= 480;
      const desktop = w >= 1024;
      if (mobilePortrait) {
        notes.push("Image dimensions resemble a mobile banking screenshot (portrait).");
        trustAccumulator += 6;
        riskDelta -= 4;
      } else if (desktop) {
        notes.push("Image dimensions resemble a desktop statement capture.");
        trustAccumulator += 4;
      }
    }
  }

  const mimeTypes = new Set(proofs.map((p) => p.mimeType));
  if (mimeTypes.has("application/pdf") && [...mimeTypes].some((m) => m.startsWith("image/"))) {
    notes.push("Mixed PDF + image proof pack — stronger corroboration.");
    trustAccumulator += 8;
    confidenceDelta += 4;
    riskDelta -= 3;
  }

  const trustScore = clamp(Math.round(trustAccumulator), 0, 100);
  return { riskDelta, confidenceDelta, trustScore, notes };
}

export function analyzeFraud(payload: AnalyzePayload): FraudResponse {
  const reasons: string[] = [];
  let risk = 8;

  const userId = payload.userId || "demo-user";
  const amount = Number(payload.amount || 0);
  const location = payload.location.toLowerCase().trim();
  const device = payload.device.toLowerCase().trim();

  const zScore = (amount - profile.avgSpend) / profile.stdSpend;
  if (Math.abs(zScore) > 2) {
    reasons.push(`Amount anomaly detected (z-score ${zScore.toFixed(2)})`);
    risk += Math.min(35, Math.abs(zScore) * 12);
  }

  const now = Date.now();
  const windowStart = now - profile.velocityWindowMinutes * 60 * 1000;
  const history = txTimestamps.get(userId) || [];
  const activeWindow = history.filter((ts) => ts >= windowStart);
  activeWindow.push(now);
  txTimestamps.set(userId, activeWindow);
  if (activeWindow.length > profile.velocityThreshold) {
    reasons.push("Velocity spike: rapid transactions in short interval");
    risk += 22;
  }

  if (!profile.knownDevices.includes(device)) {
    reasons.push("Device anomaly: unrecognized device signature");
    risk += 16;
  }

  if (!profile.commonLocations.includes(location)) {
    reasons.push("Location anomaly: uncommon geolocation");
    risk += 19;
  }

  if (payload.merchant && /crypto|gift card|wire/i.test(payload.merchant)) {
    reasons.push("Merchant category has elevated fraud risk");
    risk += 10;
  }

  const hour = Number(payload.time.split(":")[0]);
  if (!Number.isNaN(hour) && (hour < 5 || hour > 23)) {
    reasons.push("Behavioral anomaly: transaction outside normal active hours");
    risk += 9;
  }

  const normalizedRisk = clamp(Math.round(risk), 1, 99);
  const fraud = normalizedRisk >= 65;
  const confidence = clamp(
    Math.round(58 + normalizedRisk * 0.38 + (reasons.length > 2 ? 7 : 0)),
    50,
    99,
  );

  if (reasons.length === 0) reasons.push("Pattern aligns with historical normal behavior");

  const proofLayer = analyzeProofs(payload.proofs);
  const mergedRisk = clamp(normalizedRisk + proofLayer.riskDelta, 1, 99);
  const mergedConfidence = clamp(confidence + proofLayer.confidenceDelta, 50, 99);
  const mergedFraud = mergedRisk >= 65;

  const proofInsights = {
    filesAnalyzed: payload.proofs?.length ?? 0,
    trustScore: proofLayer.trustScore,
    notes: proofLayer.notes,
  };

  const mergedReasons = [...reasons, ...proofLayer.notes];

  return {
    fraud: mergedFraud,
    risk: mergedRisk,
    confidence: mergedConfidence,
    reasons: mergedReasons,
    zScore: Number(zScore.toFixed(2)),
    proofInsights,
  };
}
