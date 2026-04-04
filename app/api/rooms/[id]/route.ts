import { NextRequest, NextResponse } from "next/server";
import { updateRoom } from "@/lib/airtable";
import { trackApiCall } from "@/lib/usage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fields = await req.json();
  try {
    const updated = await updateRoom(id, fields);
    trackApiCall(1);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
