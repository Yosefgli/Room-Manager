"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, BedDouble, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { BookingFile, Room, RoomStatus } from "@/lib/airtable";

type RoomWithStatus = { room: Room; status: RoomStatus; hasOpenRepair: boolean };

type Props = {
  waitingFiles: BookingFile[];
  assignedFiles: BookingFile[];
  arrivedFiles: BookingFile[];
  roomsWithStatus: RoomWithStatus[];
};

const SECTION_COLOR: Record<string, string> = {
  ממתין: "border-yellow-200 bg-yellow-50/50",
  "הוקצה חדר": "border-cyan-200 bg-cyan-50/50",
  הגיע: "border-red-200 bg-red-50/50",
};

export function DashboardQuickActions({ waitingFiles, assignedFiles, arrivedFiles, roomsWithStatus }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState<string | null>(null);
  // Room picker sheet
  const [pickerFile, setPickerFile] = useState<BookingFile | null>(null);
  const [roomSearch, setRoomSearch] = useState("");

  const availableRooms = useMemo(() => {
    const q = roomSearch.toLowerCase();
    return roomsWithStatus
      .filter((r) => {
        const nameMatch = !q || r.room.fields["שם חדר"]?.toLowerCase().includes(q);
        return nameMatch;
      })
      .sort((a, b) => {
        // Available first, then others
        const order: Record<RoomStatus, number> = { פנוי: 0, שמור: 1, לניקוי: 2, "בשימוש": 3, "דרוש תיקון": 4 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        const locA = a.room.fields["מיקום"] ?? "";
        const locB = b.room.fields["מיקום"] ?? "";
        if (locA !== locB) return locA.localeCompare(locB, "he");
        return (a.room.fields["מספר"] ?? 0) - (b.room.fields["מספר"] ?? 0);
      });
  }, [roomsWithStatus, roomSearch]);

  async function setBookingStatus(file: BookingFile, newStatus: string) {
    setSaving(file.id);
    try {
      await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": newStatus }),
      });

      const roomIds = file.fields["חדרי אירוח"] ?? [];
      if (newStatus === "הלך" && roomIds.length > 0) {
        await Promise.all(
          roomIds.map((rid) =>
            fetch(`/api/rooms/${rid}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "סטטוס": "לניקוי" }),
            })
          )
        );
      }
      if (newStatus === "הגיע" && roomIds.length > 0) {
        await Promise.all(
          roomIds.map((rid) =>
            fetch(`/api/rooms/${rid}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "סטטוס": "בשימוש" }),
            })
          )
        );
      }

      toast.success("סטטוס עודכן");
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setSaving(null);
    }
  }

  async function assignRoom(file: BookingFile, roomItem: RoomWithStatus) {
    setSaving(file.id + roomItem.room.id);
    try {
      const existingRooms = file.fields["חדרי אירוח"] ?? [];
      const newFileStatus = file.fields["סטטוס"] === "ממתין" ? "הוקצה חדר" : file.fields["סטטוס"];

      // "שמור" = reserved; "בשימוש" only if the guest already arrived
      const newRoomStatus = file.fields["סטטוס"] === "הגיע" ? "בשימוש" : "שמור";
      await Promise.all([
        fetch(`/api/rooms/${roomItem.room.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "סטטוס": newRoomStatus }),
        }),
        fetch(`/api/bookings/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "חדרי אירוח": [...existingRooms, roomItem.room.id],
            "סטטוס": newFileStatus,
          }),
        }),
      ]);

      toast.success(`חדר ${roomItem.room.fields["שם חדר"]} הוקצה`);
      setPickerFile(null);
      setRoomSearch("");
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בהקצאת חדר");
    } finally {
      setSaving(null);
    }
  }

  const sections = [
    { label: "ממתינים להקצאה", files: waitingFiles, status: "ממתין" },
    { label: "הוקצה חדר", files: assignedFiles, status: "הוקצה חדר" },
    { label: "הגיעו", files: arrivedFiles, status: "הגיע" },
  ].filter((s) => s.files.length > 0);

  if (sections.length === 0) return null;

  return (
    <>
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">פעולות מהירות</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map(({ label, files, status }) => (
            <div key={status} className={cn("rounded-2xl border p-4 space-y-2", SECTION_COLOR[status])}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <StatusBadge status={status} type="booking" size="sm" />
              </div>
              {files.map((file) => (
                <QuickCard
                  key={file.id}
                  file={file}
                  status={status}
                  saving={saving}
                  onAssign={() => setPickerFile(file)}
                  onSetStatus={(s) => setBookingStatus(file, s)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Room picker sheet */}
      {pickerFile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPickerFile(null); setRoomSearch(""); }} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl z-10 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900">הקצה חדר</p>
                <p className="text-xs text-gray-400">{pickerFile.fields["שם איש קשר"]}</p>
              </div>
              <button onClick={() => { setPickerFile(null); setRoomSearch(""); }} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="חפש חדר..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="pr-9 rounded-xl"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {availableRooms.map((r) => {
                const isSaving = saving === pickerFile.id + r.room.id;
                return (
                  <button
                    key={r.room.id}
                    onClick={() => assignRoom(pickerFile, r)}
                    disabled={!!saving}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all hover:shadow-sm",
                      r.status === "פנוי" ? "border-green-200 bg-green-50/50" : "border-gray-100 bg-white"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-sm">🛏️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.room.fields["שם חדר"]}</p>
                      <p className="text-xs text-gray-400">{r.room.fields["מיקום"] ?? ""}</p>
                    </div>
                    <StatusBadge status={r.status} size="sm" />
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuickCard({
  file, status, saving, onAssign, onSetStatus,
}: {
  file: BookingFile;
  status: string;
  saving: string | null;
  onAssign: () => void;
  onSetStatus: (s: string) => void;
}) {
  const isSaving = saving === file.id;
  const roomCount = file.fields["חדרי אירוח"]?.length ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <Link href={`/bookings/${file.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary truncate block">
            {file.fields["שם איש קשר"]}
          </Link>
          {file.fields["מספר פלאפון"] && (
            <p className="text-xs text-gray-400">{file.fields["מספר פלאפון"]}</p>
          )}
        </div>
        {roomCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <BedDouble className="w-3 h-3" />
            {roomCount}
          </span>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {status === "ממתין" && (
          <Button size="sm" onClick={onAssign} disabled={isSaving} className="h-7 text-xs rounded-lg gap-1 flex-1">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <BedDouble className="w-3 h-3" />}
            הקצה חדר
          </Button>
        )}
        {(status === "הוקצה חדר") && (
          <>
            <Button size="sm" onClick={() => onSetStatus("הגיע")} disabled={isSaving} className="h-7 text-xs rounded-lg gap-1 flex-1 bg-green-600 hover:bg-green-700">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              הגיע
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAssign()} disabled={isSaving} className="h-7 text-xs rounded-lg">
              <BedDouble className="w-3 h-3" />
            </Button>
          </>
        )}
        {(status === "הגיע" || status === "הוקצה חדר") && (
          <Button
            size="sm" variant="outline"
            onClick={() => onSetStatus("הלך")}
            disabled={isSaving}
            className="h-7 text-xs rounded-lg gap-1 text-gray-500"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            הלך
          </Button>
        )}
        {status === "הגיע" && (
          <Button size="sm" variant="outline" onClick={() => onAssign()} disabled={isSaving} className="h-7 text-xs rounded-lg">
            <BedDouble className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
