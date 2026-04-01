import Link from "next/link";
import { Phone, BedDouble, Users, ChevronLeft } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { computeBookingFileStatus } from "@/lib/airtable";
import type { BookingFile } from "@/lib/airtable";

type BookingCardProps = {
  file: BookingFile;
  guestCount?: number;
};

export function BookingCard({ file, guestCount = 0 }: BookingCardProps) {
  const status = computeBookingFileStatus(file);
  const roomCount = file.fields["חדרי אירוח"]?.length ?? 0;

  return (
    <Link
      href={`/bookings/${file.id}`}
      className="block bg-white rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all duration-150 p-4 group"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
          {(file.fields["שם איש קשר"] || "?").charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {file.fields["שם איש קשר"] || "ללא שם"}
            </p>
            <StatusBadge status={status} type="booking" size="sm" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            {file.fields["מספר פלאפון"] && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Phone className="w-3 h-3" />
                {file.fields["מספר פלאפון"]}
              </span>
            )}
            {roomCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <BedDouble className="w-3 h-3" />
                {roomCount} חדרים
              </span>
            )}
            {guestCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3 h-3" />
                {guestCount} אורחים
              </span>
            )}
          </div>
        </div>

        {/* Arrow (flipped for RTL) */}
        <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0 rotate-180" />
      </div>

      {file.fields["הערות"] && (
        <p className="mt-2 text-xs text-gray-400 line-clamp-1 pr-13">
          {file.fields["הערות"]}
        </p>
      )}
    </Link>
  );
}
