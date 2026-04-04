export const dynamic = "force-dynamic";

import { getRooms, getBookingFiles, getRepairs, computeRoomStatus } from "@/lib/airtable";
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
      // Sort linked files by createdTime descending (most recent first)
      const linkedFiles = bookingFiles
        .filter((f) => f.fields["חדרי אירוח"]?.includes(room.id))
        .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
      return { room, status, linkedFiles };
    })
    .sort((a, b) => (a.room.fields["מספר"] ?? 0) - (b.room.fields["מספר"] ?? 0));

  return <RoomsClient roomsWithData={roomsWithData} />;
}
