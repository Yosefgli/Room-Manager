"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Users, Wrench, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Room, BookingFile, RoomStatus } from "@/lib/airtable";

type RoomWithData = {
  room: Room;
  status: RoomStatus;
  linkedFiles: BookingFile[];
};

const ALL_STATUSES: RoomStatus[] = ["דרוש תיקון", "בשימוש", "לניקוי", "שמור", "פנוי"];

const statusBorder: Record<RoomStatus, string> = {
  פנוי: "border-green-200",
  "בשימוש": "border-red-200",
  "דרוש תיקון": "border-purple-200",
  לניקוי: "border-yellow-200",
  שמור: "border-cyan-200",
};

const statusBg: Record<RoomStatus, string> = {
  פנוי: "bg-green-50",
  "בשימוש": "bg-red-50",
  "דרוש תיקון": "bg-purple-50",
  לניקוי: "bg-yellow-50",
  שמור: "bg-cyan-50",
};

const statusEditColor: Record<RoomStatus, string> = {
  פנוי: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
  "בשימוש": "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
  "דרוש תיקון": "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  לניקוי: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
  שמור: "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
};

export function RoomsClient({ roomsWithData }: { roomsWithData: RoomWithData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState<RoomStatus | null>(null);
  const [editRoom, setEditRoom] = useState<RoomWithData | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = filterStatus
    ? roomsWithData.filter((r) => r.status === filterStatus)
    : roomsWithData;

  // Group by מיקום
  const byLocation: Record<string, RoomWithData[]> = {};
  filtered.forEach((item) => {
    const loc = item.room.fields["מיקום"] ?? "ללא מיקום";
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(item);
  });

  async function setStatus(roomId: string, status: RoomStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": status }),
      });
      if (!res.ok) throw new Error();
      toast.success("סטטוס עודכן");
      setEditRoom(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון סטטוס");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">חדרי אירוח</h1>
        <p className="text-gray-500 text-sm mt-1">{roomsWithData.length} חדרים במערכת</p>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
            filterStatus === null
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          )}
        >
          הכל ({roomsWithData.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = roomsWithData.filter((r) => r.status === s).length;
          if (!count) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? null : s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                filterStatus === s
                  ? "ring-2 ring-offset-1 ring-gray-400"
                  : "hover:shadow-sm"
              )}
            >
              <StatusBadge status={s} size="sm" />
              <span className="mr-1 text-gray-500">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grouped by location */}
      {Object.entries(byLocation).map(([location, items]) => (
        <section key={location}>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            {location}
            <span className="font-normal text-gray-400">({items.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map(({ room, status, linkedFiles }) => (
              <button
                key={room.id}
                onClick={() => setEditRoom({ room, status, linkedFiles })}
                className={cn(
                  "bg-white rounded-2xl border p-3 text-right transition-all duration-150 hover:shadow-md active:scale-95 w-full",
                  statusBorder[status]
                )}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", statusBg[status])}>
                    <span className="text-sm">🛏️</span>
                  </div>
                  <StatusBadge status={status} size="sm" />
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {room.fields["שם חדר"] || "ללא שם"}
                </p>
                {room.fields["קיבולת"] && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {room.fields["קיבולת"]}
                  </p>
                )}
                {linkedFiles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5 truncate">
                    {linkedFiles[0].fields["שם איש קשר"]}
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛏️</p>
          <p>אין חדרים{filterStatus ? ` בסטטוס "${filterStatus}"` : ""}</p>
        </div>
      )}

      {/* Edit Room Sheet */}
      {editRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setEditRoom(null)}
          />
          {/* Panel */}
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 shadow-xl z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">
                  {editRoom.room.fields["שם חדר"]}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editRoom.room.fields["מיקום"] ?? ""}
                  {editRoom.room.fields["קיבולת"] ? ` · ${editRoom.room.fields["קיבולת"]} מקומות` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditRoom(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current status */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500">סטטוס נוכחי:</span>
              <StatusBadge status={editRoom.status} />
            </div>

            {/* Recent guest */}
            {editRoom.linkedFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">תיק אחרון</p>
                <Link
                  href={`/bookings/${editRoom.linkedFiles[0].id}`}
                  onClick={() => setEditRoom(null)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {(editRoom.linkedFiles[0].fields["שם איש קשר"] || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {editRoom.linkedFiles[0].fields["שם איש קשר"]}
                    </p>
                  </div>
                </Link>
              </div>
            )}

            {/* Change status */}
            <p className="text-xs text-gray-500 mb-2">שנה סטטוס ל:</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.filter((s) => s !== editRoom.status).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(editRoom.room.id, s)}
                  disabled={saving}
                  className={cn(
                    "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all",
                    statusEditColor[s],
                    saving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
