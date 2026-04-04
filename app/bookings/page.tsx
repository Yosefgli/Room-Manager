export const dynamic = "force-dynamic";

import { getBookingFiles, getGuests } from "@/lib/airtable";
import { BookingsSearch } from "@/components/bookings-search";
import { NewBookingDialog } from "@/components/new-booking-dialog";
import type { Guest } from "@/lib/airtable";

export default async function BookingsPage() {
  const [bookingFiles, allGuests] = await Promise.all([getBookingFiles(), getGuests()]);

  const activeFiles = bookingFiles.filter((f) => f.fields["סטטוס"] !== "הלך");

  const guestsById: Record<string, Guest> = {};
  allGuests.forEach((g) => { guestsById[g.id] = g; });

  const guestCountMap: Record<string, number> = {};
  const guestsMap: Record<string, Guest[]> = {};
  activeFiles.forEach((file) => {
    const ids = file.fields["בקשות אירוח"] ?? [];
    guestCountMap[file.id] = ids.length;
    guestsMap[file.id] = ids.map((id) => guestsById[id]).filter(Boolean);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תיקי בקשות אירוח</h1>
          <p className="text-gray-500 text-sm mt-1">{activeFiles.length} תיקים פעילים</p>
        </div>
        <NewBookingDialog />
      </div>

      <BookingsSearch
        files={activeFiles}
        guestCounts={guestCountMap}
        guestsMap={guestsMap}
      />
    </div>
  );
}
