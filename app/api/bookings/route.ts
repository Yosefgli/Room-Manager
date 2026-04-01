import { NextRequest, NextResponse } from "next/server";
import { createBookingFile } from "@/lib/airtable";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const record = await createBookingFile(body);
    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
