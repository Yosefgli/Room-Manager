import { NextRequest, NextResponse } from "next/server";
import { getCycleSummaries, setCycleStartDay } from "@/lib/usage";

export async function GET() {
  try {
    const data = getCycleSummaries();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to read usage" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.cycleStartDay === "number") {
      setCycleStartDay(body.cycleStartDay);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
