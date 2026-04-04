export const dynamic = "force-dynamic";

import {
  getRooms, getBookingFiles, getRepairs,
  computeRoomStatus, hasOpenRepairForRoom,
} from "@/lib/airtable";
import { RoomsClient } from "@/components/rooms-client";

export default async function RoomsPage() {
  const [rooms, bookingFiles, repairs] = await Promise.all([
    getRooms(),
    getBookingFiles(),
    getRepairs(),
  ]);

  const roomsWithData = rooms
    .map((room) => {
      const status = computeRoomStatus(room, repairs, bookingFiles);
      const linkedFiles = bookingFiles
        .filter((f) => f.fields["חדרי אירוח"]?.includes(room.id))
        .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
      return {
        room,
        status,
        linkedFiles,
        hasOpenRepair: hasOpenRepairForRoom(room, repairs),
      };
    })
    .sort((a, b) => {
      const locA = a.room.fields["מיקום"] ?? "";
      const locB = b.room.fields["מיקום"] ?? "";
      if (locA !== locB) return locA.localeCompare(locB, "he");
      return (a.room.fields["מספר"] ?? 0) - (b.room.fields["מספר"] ?? 0);
    });

  const activeBookingFiles = bookingFiles.filter((f) => f.fields["סטטוס"] !== "הלך");

  return <RoomsClient roomsWithData={roomsWithData} allBookingFiles={activeBookingFiles} />;
}
