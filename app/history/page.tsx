export const dynamic = "force-dynamic";

import { getBookingFiles } from "@/lib/airtable";
import { BookingCard } from "@/components/booking-card";
import { History } from "lucide-react";

export default async function HistoryPage() {
  const bookingFiles = await getBookingFiles();

  const goneFiles = bookingFiles
    .filter((f) => f.fields["סטטוס"] === "הלך")
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

  const guestCountMap: Record<string, number> = {};
  goneFiles.forEach((file) => {
    guestCountMap[file.id] = file.fields["בקשות אירוח"]?.length ?? 0;
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
        <div className="space-y-2">
          {goneFiles.map((file) => (
            <BookingCard key={file.id} file={file} guestCount={guestCountMap[file.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
