import { NextRequest, NextResponse } from "next/server";
import { createRepair } from "@/lib/airtable";
import { trackApiCall } from "@/lib/usage";

export async function POST(req: NextRequest) {
  const fields = await req.json();
  try {
    const record = await createRepair(fields);
    trackApiCall(1);
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
