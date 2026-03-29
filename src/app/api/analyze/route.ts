import { NextResponse } from "next/server";
import { analyzeFraud } from "@/lib/fraud";
import { AnalyzePayload } from "@/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzePayload;
    const result = analyzeFraud(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
