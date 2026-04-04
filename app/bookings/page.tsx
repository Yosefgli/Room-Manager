export const dynamic = "force-dynamic";

import { getBookingFiles, getGuests } from "@/lib/airtable";
import { BookingCard } from "@/components/booking-card";
import { BookingsSearch } from "@/components/bookings-search";
import { NewBookingDialog } from "@/components/new-booking-dialog";

export default async function BookingsPage() {
  const [bookingFiles, guests] = await Promise.all([
    getBookingFiles(),
    getGuests(),
  ]);

  // Map guest counts per file
  const guestCountMap: Record<string, number> = {};
  bookingFiles.forEach((file) => {
    const count = file.fields["בקשות אירוח"]?.length ?? 0;
    guestCountMap[file.id] = count;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תיקי בקשות אירוח</h1>
          <p className="text-gray-500 text-sm mt-1">{bookingFiles.length} תיקים</p>
        </div>
        <NewBookingDialog />
      </div>

      {/* Search + list (client component) */}
      <BookingsSearch
        files={bookingFiles}
        guestCounts={guestCountMap}
      />
    </div>
  );
}
