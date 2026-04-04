import { NextRequest, NextResponse } from "next/server";
import { updateGuest, deleteGuest } from "@/lib/airtable";
import { trackApiCall } from "@/lib/usage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const record = await updateGuest(id, body);
    trackApiCall(1);
    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteGuest(id);
    trackApiCall(1);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete guest" }, { status: 500 });
  }
}
