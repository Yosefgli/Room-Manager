import { getRooms, getBookingFiles, getRepairs, computeRoomStatus } from "@/lib/airtable";
import { RoomCard } from "@/components/room-card";
import { StatusBadge } from "@/components/status-badge";
import type { RoomStatus } from "@/lib/airtable";

export default async function RoomsPage() {
  const [rooms, bookingFiles, repairs] = await Promise.all([
    getRooms(),
    getBookingFiles(),
    getRepairs(),
  ]);

  const roomsWithData = rooms.map((room) => {
    const status = computeRoomStatus(room, repairs, bookingFiles);
    const linkedFiles = bookingFiles.filter((f) =>
      f.fields["חדרי אירוח"]?.includes(room.id)
    );
    return { room, status, linkedFiles };
  });

  const statusOrder: RoomStatus[] = ["דרוש תיקון", "בשימוש", "לניקוי", "שמור", "פנוי"];
  const grouped = statusOrder.reduce<Record<string, typeof roomsWithData>>(
    (acc, s) => {
      const items = roomsWithData.filter((r) => r.status === s);
      if (items.length > 0) acc[s] = items;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">חדרי אירוח</h1>
        <p className="text-gray-500 text-sm mt-1">{rooms.length} חדרים במערכת</p>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2">
        {statusOrder.map((status) => {
          const count = roomsWithData.filter((r) => r.status === status).length;
          if (!count) return null;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <StatusBadge status={status} />
              <span className="text-sm text-gray-500">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Grouped by status */}
      {Object.entries(grouped).map(([status, items]) => (
        <section key={status}>
          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={status as RoomStatus} />
            <span className="text-sm text-gray-500">{items.length} חדרים</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map(({ room, status: s, linkedFiles }) => (
              <RoomCard
                key={room.id}
                room={room}
                status={s}
                linkedFiles={linkedFiles}
              />
            ))}
          </div>
        </section>
      ))}

      {rooms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛏️</p>
          <p>אין חדרים במערכת</p>
        </div>
      )}
    </div>
  );
}
