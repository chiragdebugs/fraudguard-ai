import { AnalyzePayload, FraudResponse } from "@/types";

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

  return {
    fraud,
    risk: normalizedRisk,
    confidence,
    reasons,
    zScore: Number(zScore.toFixed(2)),
  };
}
