export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import {
  getBookingFile,
  getRooms,
  getBookingFiles,
  getRepairs,
  getGuests,
  computeRoomStatus,
} from "@/lib/airtable";
import { BookingDetailClient } from "@/components/booking-detail-client";
import { trackApiCall } from "@/lib/usage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;

  try {
    const [file, rooms, allFiles, repairs, allGuests] = await Promise.all([
      getBookingFile(id),
      getRooms(),
      getBookingFiles(),
      getRepairs(),
      getGuests(),
    ]);
    trackApiCall(5); // getBookingFile + getRooms + getBookingFiles + getRepairs + getGuests

    // Rooms with computed status
    const roomsWithStatus = rooms.map((room) => ({
      room,
      status: computeRoomStatus(room, repairs, allFiles),
    }));

    // Guests belonging to this file
    const fileGuestIds = file.fields["בקשות אירוח"] ?? [];
    const fileGuests = allGuests.filter((g) => fileGuestIds.includes(g.id));

    // Currently assigned room IDs
    const assignedRoomIds = file.fields["חדרי אירוח"] ?? [];

    // For rooms in use — find which file uses them (for warning)
    const roomToFile: Record<string, string> = {};
    allFiles.forEach((f) => {
      f.fields["חדרי אירוח"]?.forEach((rid) => {
        if (!roomToFile[rid]) {
          roomToFile[rid] = f.fields["שם איש קשר"] || f.id;
        }
      });
    });

    return (
      <BookingDetailClient
        file={file}
        roomsWithStatus={roomsWithStatus}
        fileGuests={fileGuests}
        assignedRoomIds={assignedRoomIds}
        roomToFile={roomToFile}
      />
    );
  } catch {
    notFound();
  }
}
