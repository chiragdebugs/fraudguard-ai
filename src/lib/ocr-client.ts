import Tesseract from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
  matchedFields: string[];
};

export async function extractOcrFromFile(file: File): Promise<OcrResult | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const result = await Tesseract.recognize(file, "eng");
    return {
      text: result.data.text || "",
      confidence: Number(result.data.confidence?.toFixed(1) || 0),
      matchedFields: [],
    };
  } catch {
    return null;
  }
}
