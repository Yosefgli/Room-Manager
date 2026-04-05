import { NextRequest, NextResponse } from "next/server";
import {
  getBookingFiles,
  updateRoom,
  updateBookingFile,
} from "@/lib/airtable";
import { trackApiCall } from "@/lib/usage";

export async function POST(req: NextRequest) {
  try {
    const { action, bookingId, roomId } = await req.json();

    if (!action || !bookingId) {
      return NextResponse.json(
        { error: "חסרים נתונים" },
        { status: 400 }
      );
    }

    // ── Single room check-in → cascade booking to "הגיע" ─────────
    if (action === "room-checkin") {
      if (!roomId) {
        return NextResponse.json(
          { error: "חסר מזהה חדר" },
          { status: 400 }
        );
      }

      await updateRoom(roomId, { סטטוס: "בשימוש" });
      trackApiCall(1);

      // Cascade: if booking was "הוקצה חדר" → change to "הגיע"
      const bookingFiles = await getBookingFiles();
      trackApiCall(1);
      const booking = bookingFiles.find((f) => f.id === bookingId);
      if (booking && booking.fields["סטטוס"] === "הוקצה חדר") {
        await updateBookingFile(bookingId, { סטטוס: "הגיע" });
        trackApiCall(1);
      }

      return NextResponse.json({
        success: true,
        message: "חדר סומן כ\"בשימוש\"",
        bookingStatusChanged: booking?.fields["סטטוס"] === "הוקצה חדר",
      });
    }

    // ── Mark guest as arrived → all rooms to "בשימוש" ────────────
    if (action === "guest-arrived") {
      const bookingFiles = await getBookingFiles();
      trackApiCall(1);

      const booking = bookingFiles.find((f) => f.id === bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: "לא נמצא תיק אירוח" },
          { status: 404 }
        );
      }

      // Update booking status to "הגיע"
      await updateBookingFile(bookingId, { סטטוס: "הגיע" });
      trackApiCall(1);

      // Update all linked rooms to "בשימוש"
      const roomIds = booking.fields["חדרי אירוח"] ?? [];
      if (roomIds.length > 0) {
        await Promise.all(
          roomIds.map((rid) => updateRoom(rid, { סטטוס: "בשימוש" }))
        );
        trackApiCall(roomIds.length);
      }

      return NextResponse.json({
        success: true,
        message: "האורח סומן כ\"הגיע\" וכל החדרים עודכנו ל\"בשימוש\"",
      });
    }

    return NextResponse.json(
      { error: "פעולה לא מוכרת" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Guest action API error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
