import Link from "next/link";
import { Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { Room, BookingFile, RoomStatus } from "@/lib/airtable";

type RoomCardProps = {
  room: Room;
  status: RoomStatus;
  linkedFiles?: BookingFile[];
  compact?: boolean;
};

const statusBorder: Record<RoomStatus, string> = {
  פנוי: "border-green-200 hover:border-green-300",
  "בשימוש": "border-red-200 hover:border-red-300",
  "דרוש תיקון": "border-purple-200 hover:border-purple-300",
  לניקוי: "border-yellow-200 hover:border-yellow-300",
  שמור: "border-cyan-200 hover:border-cyan-300",
};

const statusBg: Record<RoomStatus, string> = {
  פנוי: "bg-green-50",
  "בשימוש": "bg-red-50",
  "דרוש תיקון": "bg-purple-50",
  לניקוי: "bg-yellow-50",
  שמור: "bg-cyan-50",
};

export function RoomCard({ room, status, linkedFiles: rawFiles = [], compact = false }: RoomCardProps) {
  const linkedFiles = [...rawFiles].sort(
    (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
  );
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border p-4 transition-all duration-150",
        statusBorder[status],
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", statusBg[status])}>
          <span className="text-base">🛏️</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {room.fields["שם חדר"] || "ללא שם"}
          </p>
          {room.fields["קיבולת"] && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" />
              {room.fields["קיבולת"]} מקומות
            </p>
          )}
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Linked files */}
      {!compact && linkedFiles.length > 0 && (
        <div className="space-y-1">
          {linkedFiles.slice(0, 2).map((file) => (
            <Link
              key={file.id}
              href={`/bookings/${file.id}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <span className="truncate">{file.fields["שם איש קשר"]}</span>
            </Link>
          ))}
          {linkedFiles.length > 2 && (
            <p className="text-xs text-gray-400">+{linkedFiles.length - 2} נוספים</p>
          )}
        </div>
      )}

      {!compact && status === "דרוש תיקון" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-600">
          <Wrench className="w-3 h-3" />
          <span>ממתין לתיקון</span>
        </div>
      )}
    </div>
  );
}
