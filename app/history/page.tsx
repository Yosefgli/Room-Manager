export const dynamic = "force-dynamic";

import { getBookingFiles, getGuests } from "@/lib/airtable";
import { BookingsSearch } from "@/components/bookings-search";
import { History } from "lucide-react";
import type { Guest } from "@/lib/airtable";

export default async function HistoryPage() {
  const [bookingFiles, allGuests] = await Promise.all([getBookingFiles(), getGuests()]);

  const goneFiles = bookingFiles
    .filter((f) => f.fields["סטטוס"] === "הלך")
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

  const guestsById: Record<string, Guest> = {};
  allGuests.forEach((g) => { guestsById[g.id] = g; });

  const guestCountMap: Record<string, number> = {};
  const guestsMap: Record<string, Guest[]> = {};
  goneFiles.forEach((file) => {
    const ids = file.fields["בקשות אירוח"] ?? [];
    guestCountMap[file.id] = ids.length;
    guestsMap[file.id] = ids.map((id) => guestsById[id]).filter(Boolean);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <History className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">היסטוריית תיקים</h1>
          <p className="text-gray-500 text-sm mt-0.5">{goneFiles.length} תיקים שסיימו</p>
        </div>
      </div>

      {goneFiles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>אין תיקים בהיסטוריה עדיין</p>
        </div>
      ) : (
        <BookingsSearch
          files={goneFiles}
          guestCounts={guestCountMap}
          guestsMap={guestsMap}
        />
      )}
    </div>
  );
}
