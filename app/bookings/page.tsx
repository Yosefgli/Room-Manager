export const dynamic = "force-dynamic";

import { getBookingFiles, getGuests } from "@/lib/airtable";
import { BookingCard } from "@/components/booking-card";
import { BookingsSearch } from "@/components/bookings-search";
import { NewBookingDialog } from "@/components/new-booking-dialog";

export default async function BookingsPage() {
  const [bookingFiles] = await Promise.all([getBookingFiles()]);

  // Exclude "הלך" — those go to history page
  const activeFiles = bookingFiles.filter((f) => f.fields["סטטוס"] !== "הלך");

  const guestCountMap: Record<string, number> = {};
  activeFiles.forEach((file) => {
    guestCountMap[file.id] = file.fields["בקשות אירוח"]?.length ?? 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תיקי בקשות אירוח</h1>
          <p className="text-gray-500 text-sm mt-1">{activeFiles.length} תיקים פעילים</p>
        </div>
        <NewBookingDialog />
      </div>

      {/* Search + list (client component) */}
      <BookingsSearch
        files={activeFiles}
        guestCounts={guestCountMap}
      />
    </div>
  );
}
