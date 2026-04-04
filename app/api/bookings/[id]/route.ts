import { NextRequest, NextResponse } from "next/server";
import { updateBookingFile } from "@/lib/airtable";
import { trackApiCall } from "@/lib/usage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const record = await updateBookingFile(id, body);
    trackApiCall(1);
    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
