export const REASON_CATALOG: Record<string, { title: string; detail: string; category?: "location" | "velocity" | "device" | "amount" | "merchant" | "time" }> =
  {
    unusual_location: {
      title: "Unusual location",
      detail: "The transaction originates from a location that doesn't match typical behavior patterns.",
      category: "location",
    },
    velocity_check_failed: {
      title: "Velocity check failed",
      detail: "Activity frequency exceeds typical limits in the recent window.",
      category: "velocity",
    },
    device_mismatch: {
      title: "Device mismatch",
      detail: "The device identity doesn't align with the expected device fingerprint.",
      category: "device",
    },
    device_anomaly: {
      title: "Device anomaly",
      detail: "Unrecognized device metadata was detected.",
      category: "device",
    },
    amount_zscore_high: {
      title: "Amount anomaly",
      detail: "Transaction amount deviates significantly from historical baselines.",
      category: "amount",
    },
    merchant_risk_high: {
      title: "High-risk merchant",
      detail: "The merchant category has elevated fraud probability based on modeled risk.",
      category: "merchant",
    },
    odd_transaction_time: {
      title: "Odd transaction time",
      detail: "This activity occurs outside the usual active period for the customer.",
      category: "time",
    },
    recent_chargeback_risk: {
      title: "Chargeback risk spike",
      detail: "Model indicates a recent increase in dispute/chargeback patterns.",
      category: "merchant",
    },
  };

export function toReasonTitle(code: string) {
  return REASON_CATALOG[code]?.title ?? code;
}

export function toReasonDetail(code: string) {
  return REASON_CATALOG[code]?.detail ?? "No further detail available for this reason code.";
}

