export type AnalyzePayload = {
  amount: number;
  location: string;
  device: string;
  time: string;
  merchant?: string;
  userId?: string;
};

export type FraudResponse = {
  fraud: boolean;
  risk: number;
  confidence: number;
  reasons: string[];
  zScore: number;
};

export type TransactionRecord = AnalyzePayload &
  FraudResponse & {
    id: string;
    createdAt: string;
  };
