export type ProofFileMeta = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type AnalyzePayload = {
  amount: number;
  location: string;
  device: string;
  time: string;
  merchant?: string;
  userId?: string;
  proofs?: ProofFileMeta[];
  ocrText?: string;
  ocrConfidence?: number;
  ocrMatchedFields?: string[];
};

export type ProofInsights = {
  filesAnalyzed: number;
  trustScore: number;
  notes: string[];
};

export type FraudResponse = {
  fraud: boolean;
  risk: number;
  confidence: number;
  reasons: string[];
  zScore: number;
  proofInsights?: ProofInsights;
  ocrInsights?: {
    confidence?: number;
    matchedFields: string[];
    notes: string[];
  };
};

export type TransactionRecord = Omit<AnalyzePayload, "proofs" | "ocrText"> &
  FraudResponse & {
    id: string;
    createdAt: string;
    proofFileCount?: number;
    txnId?: string;
    probability?: number;
    status?: "pending" | "blocked" | "approved" | "proof_requested";
  };
