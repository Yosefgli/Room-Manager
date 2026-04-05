import { NextRequest, NextResponse } from "next/server";
import {
  getRooms,
  getBookingFiles,
  getRepairs,
  updateRoom,
  updateBookingFile,
  computeRoomStatus,
} from "@/lib/airtable";
import { trackApiCall } from "@/lib/usage";

export async function POST(req: NextRequest) {
  try {
    const { mode, value } = await req.json();

    if (!mode || !value) {
      return NextResponse.json(
        { error: "חסרים נתונים" },
        { status: 400 }
      );
    }

    // ── Key scan (check-in / check-out) ──────────────────────────
    if (mode === "key-checkin" || mode === "key-checkout") {
      const roomNumber = Number(value);
      if (isNaN(roomNumber)) {
        return NextResponse.json(
          { error: "ערך QR לא תקין — צריך להיות מספר חדר" },
          { status: 400 }
        );
      }

      const [rooms, bookingFiles, repairs] = await Promise.all([
        getRooms(),
        getBookingFiles(),
        getRepairs(),
      ]);
      trackApiCall(3);

      const room = rooms.find((r) => r.fields["מספר"] === roomNumber);
      if (!room) {
        return NextResponse.json(
          { error: `לא נמצא חדר עם מספר ${roomNumber}` },
          { status: 404 }
        );
      }

      const linkedFiles = bookingFiles.filter((f) =>
        f.fields["חדרי אירוח"]?.includes(room.id)
      );

      if (mode === "key-checkin") {
        // Room → "בשימוש"
        await updateRoom(room.id, { סטטוס: "בשימוש" });
        trackApiCall(1);

        // Cascade: booking "הוקצה חדר" → "הגיע"
        for (const bf of linkedFiles) {
          if (bf.fields["סטטוס"] === "הוקצה חדר") {
            await updateBookingFile(bf.id, { סטטוס: "הגיע" });
            trackApiCall(1);
          }
        }

        return NextResponse.json({
          success: true,
          roomName: room.fields["שם חדר"],
          roomNumber: room.fields["מספר"],
          newStatus: "בשימוש",
          message: `חדר ${room.fields["שם חדר"]} סומן כ"בשימוש"`,
        });
      }

      if (mode === "key-checkout") {
        // Room → "לניקוי"
        await updateRoom(room.id, { סטטוס: "לניקוי" });
        trackApiCall(1);

        // Cascade: check if all rooms for each booking file are done
        for (const bf of linkedFiles) {
          const fileRoomIds = bf.fields["חדרי אירוח"] ?? [];
          const allDone = fileRoomIds.every((rid) => {
            if (rid === room.id) return true; // this room is now "לניקוי"
            const otherRoom = rooms.find((r) => r.id === rid);
            if (!otherRoom) return true;
            const otherStatus = computeRoomStatus(otherRoom, repairs, bookingFiles);
            return otherStatus === "לניקוי" || otherStatus === "פנוי";
          });
          if (
            allDone &&
            ["הגיע", "הוקצה חדר"].includes(bf.fields["סטטוס"] ?? "")
          ) {
            await updateBookingFile(bf.id, { סטטוס: "הלך" });
            trackApiCall(1);
          }
        }

        return NextResponse.json({
          success: true,
          roomName: room.fields["שם חדר"],
          roomNumber: room.fields["מספר"],
          newStatus: "לניקוי",
          message: `חדר ${room.fields["שם חדר"]} סומן כ"לניקוי"`,
        });
      }
    }

    // ── Guest QR scan ────────────────────────────────────────────
    if (mode === "guest") {
      const bookingId = String(value);

      const [bookingFiles, rooms, repairs] = await Promise.all([
        getBookingFiles(),
        getRooms(),
        getRepairs(),
      ]);
      trackApiCall(3);

      const booking = bookingFiles.find((f) => f.id === bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: "לא נמצא תיק אירוח עם מזהה זה" },
          { status: 404 }
        );
      }

      const linkedRoomIds = booking.fields["חדרי אירוח"] ?? [];
      const linkedRooms = linkedRoomIds
        .map((rid) => {
          const room = rooms.find((r) => r.id === rid);
          if (!room) return null;
          return {
            id: room.id,
            name: room.fields["שם חדר"],
            number: room.fields["מספר"],
            status: computeRoomStatus(room, repairs, bookingFiles),
          };
        })
        .filter(Boolean);

      return NextResponse.json({
        success: true,
        booking: {
          id: booking.id,
          contactName: booking.fields["שם איש קשר"],
          phone: booking.fields["מספר פלאפון"],
          status: booking.fields["סטטוס"],
        },
        rooms: linkedRooms,
      });
    }

    return NextResponse.json(
      { error: "מצב סריקה לא מוכר" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Scan API error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
