"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, X, Loader2, Search, AlertTriangle, Wrench, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Room, BookingFile, RoomStatus } from "@/lib/airtable";

type RoomWithData = {
  room: Room;
  status: RoomStatus;
  linkedFiles: BookingFile[];
  hasOpenRepair: boolean;
};

type SheetMode = "edit" | "repair-form" | "assign";
type SheetState = { mode: SheetMode; item: RoomWithData } | null;

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
const statusBtn: Record<RoomStatus, string> = {
  פנוי: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
  "בשימוש": "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
  "דרוש תיקון": "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  לניקוי: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
  שמור: "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
};
const bookingStatusBtn: Record<string, string> = {
  ממתין: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
  "הוקצה חדר": "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
  הגיע: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
  הלך: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
};

export function RoomsClient({
  roomsWithData,
  allBookingFiles,
}: {
  roomsWithData: RoomWithData[];
  allBookingFiles: BookingFile[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filterStatuses, setFilterStatuses] = useState<Set<RoomStatus>>(new Set());
  const [sheet, setSheet] = useState<SheetState>(null);
  const [saving, setSaving] = useState(false);
  const [repairDesc, setRepairDesc] = useState("");
  const [assignSearch, setAssignSearch] = useState("");

  const filtered = filterStatuses.size > 0
    ? roomsWithData.filter((r) => filterStatuses.has(r.status))
    : roomsWithData;

  function toggleFilter(s: RoomStatus) {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const byLocation: Record<string, RoomWithData[]> = {};
  filtered.forEach((item) => {
    const loc = item.room.fields["מיקום"] ?? "ללא מיקום";
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(item);
  });

  // Assign: filtered booking files
  const assignableFiles = useMemo(() => {
    let files = allBookingFiles.filter((f) => f.fields["סטטוס"] !== "הלך");
    const q = assignSearch.trim().toLowerCase();
    if (q) {
      files = files.filter(
        (f) =>
          f.fields["שם איש קשר"]?.toLowerCase().includes(q) ||
          f.fields["מספר פלאפון"]?.includes(q)
      );
    }
    const order: Record<string, number> = { "ממתין": 0, "הוקצה חדר": 1, "הגיע": 2 };
    return files.sort(
      (a, b) => (order[a.fields["סטטוס"] ?? ""] ?? 3) - (order[b.fields["סטטוס"] ?? ""] ?? 3)
    );
  }, [allBookingFiles, assignSearch]);

  function closeSheet() {
    setSheet(null);
    setRepairDesc("");
    setAssignSearch("");
  }

  async function setRoomStatus(item: RoomWithData, newStatus: RoomStatus) {
    if (newStatus === "דרוש תיקון") {
      setSheet({ mode: "repair-form", item });
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/rooms/${item.room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": newStatus }),
      });

      // Cascade: room → "בשימוש" → if booking was "הוקצה חדר" → booking "הגיע"
      if (newStatus === "בשימוש") {
        for (const bf of item.linkedFiles) {
          if (bf.fields["סטטוס"] === "הוקצה חדר") {
            await fetch(`/api/bookings/${bf.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "סטטוס": "הגיע" }),
            });
          }
        }
      }

      // Cascade: room → "לניקוי" → check if booking file should become "הלך"
      if (newStatus === "לניקוי") {
        for (const bf of item.linkedFiles) {
          const fileRoomIds = bf.fields["חדרי אירוח"] ?? [];
          const allDone = fileRoomIds.every((rid) => {
            if (rid === item.room.id) return true;
            const other = roomsWithData.find((r) => r.room.id === rid);
            return !other || other.status === "לניקוי" || other.status === "פנוי";
          });
          if (allDone && ["הגיע", "הוקצה חדר"].includes(bf.fields["סטטוס"] ?? "")) {
            await fetch(`/api/bookings/${bf.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "סטטוס": "הלך" }),
            });
          }
        }
      }

      toast.success("סטטוס עודכן");
      closeSheet();
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון סטטוס");
    } finally {
      setSaving(false);
    }
  }

  async function submitRepairForm(item: RoomWithData) {
    setSaving(true);
    try {
      await fetch(`/api/rooms/${item.room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": "דרוש תיקון" }),
      });
      if (repairDesc.trim()) {
        await fetch("/api/repairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "חדרי אירוח": [item.room.id],
            "תיקון שנדרש": repairDesc.trim(),
            "סטטוס": "דרוש תיקון",
          }),
        });
      }
      toast.success("עודכן בהצלחה");
      closeSheet();
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setSaving(false);
    }
  }

  async function setBookingStatus(bookingFile: BookingFile, newStatus: string, roomItem: RoomWithData) {
    setSaving(true);
    try {
      await fetch(`/api/bookings/${bookingFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": newStatus }),
      });
      const roomIds = bookingFile.fields["חדרי אירוח"] ?? [];
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
      toast.success("סטטוס תיק עודכן");
      closeSheet();
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setSaving(false);
    }
  }

  async function assignToBooking(item: RoomWithData, bookingFile: BookingFile) {
    setSaving(true);
    try {
      const existingRooms = bookingFile.fields["חדרי אירוח"] ?? [];
      const newFileStatus = bookingFile.fields["סטטוס"] === "ממתין" ? "הוקצה חדר" : bookingFile.fields["סטטוס"];
      // Room status: "שמור" unless guest already arrived
      const newRoomStatus = bookingFile.fields["סטטוס"] === "הגיע" ? "בשימוש" : "שמור";
      await Promise.all([
        fetch(`/api/rooms/${item.room.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "סטטוס": newRoomStatus }),
        }),
        fetch(`/api/bookings/${bookingFile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "חדרי אירוח": [...existingRooms, item.room.id],
            "סטטוס": newFileStatus,
          }),
        }),
      ]);
      toast.success("חדר הוקצה בהצלחה");
      closeSheet();
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בהקצאת חדר");
    } finally {
      setSaving(false);
    }
  }

  const currentItem = sheet?.item;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">חדרי אירוח</h1>
        <p className="text-gray-500 text-sm mt-1">{roomsWithData.length} חדרים במערכת</p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatuses(new Set())}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
            filterStatuses.size === 0
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
              onClick={() => toggleFilter(s)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white transition-all hover:shadow-sm",
                filterStatuses.has(s) && "ring-2 ring-offset-1 ring-gray-500 shadow-sm"
              )}
            >
              <StatusBadge status={s} size="sm" />
              <span className="text-gray-500">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Rooms grouped by location */}
      {Object.entries(byLocation).map(([location, items]) => (
        <section key={location}>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            {location}
            <span className="font-normal text-gray-400">({items.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => (
              <button
                key={item.room.id}
                onClick={() => setSheet({ mode: "edit", item })}
                className={cn(
                  "relative bg-white rounded-2xl border p-3 text-right transition-all hover:shadow-md active:scale-95 w-full",
                  statusBorder[item.status]
                )}
              >
                {/* Repair warning dot */}
                {item.hasOpenRepair && item.status !== "דרוש תיקון" && (
                  <span className="absolute top-2 left-2 w-2 h-2 bg-orange-400 rounded-full" />
                )}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", statusBg[item.status])}>
                    <span className="text-sm">🛏️</span>
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {item.room.fields["שם חדר"] || "ללא שם"}
                </p>
                {item.room.fields["קיבולת"] && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />{item.room.fields["קיבולת"]}
                  </p>
                )}
                {item.linkedFiles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {item.linkedFiles[0].fields["שם איש קשר"]}
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
          <p>אין חדרים{filterStatuses.size > 0 ? " בסטטוסים שנבחרו" : ""}</p>
        </div>
      )}

      {/* Bottom sheet */}
      {sheet && currentItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && closeSheet()} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl z-10 max-h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {sheet.mode !== "edit" && (
                  <button onClick={() => setSheet({ mode: "edit", item: currentItem })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <p className="font-bold text-gray-900">{currentItem.room.fields["שם חדר"]}</p>
                  <p className="text-xs text-gray-400">
                    {currentItem.room.fields["מיקום"] ?? ""}
                    {currentItem.room.fields["קיבולת"] ? ` · ${currentItem.room.fields["קיבולת"]} מקומות` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => !saving && closeSheet()} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Edit mode */}
              {sheet.mode === "edit" && (
                <div className="p-4 space-y-4">
                  {/* Open repair warning */}
                  {currentItem.hasOpenRepair && currentItem.status !== "דרוש תיקון" && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>לחדר זה יש תיקון פתוח</span>
                    </div>
                  )}

                  {/* Current status */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-500">סטטוס נוכחי:</span>
                    <StatusBadge status={currentItem.status} />
                  </div>

                  {/* Linked booking files */}
                  {currentItem.linkedFiles.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">תיק מקושר</p>
                      {currentItem.linkedFiles.slice(0, 1).map((bf) => (
                        <div key={bf.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Link href={`/bookings/${bf.id}`} onClick={closeSheet} className="text-sm font-semibold text-primary hover:underline">
                              {bf.fields["שם איש קשר"]}
                            </Link>
                            <StatusBadge status={bf.fields["סטטוס"] ?? "ממתין"} type="booking" size="sm" />
                          </div>
                          <p className="text-xs text-gray-400">שנה סטטוס תיק:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {["ממתין", "הוקצה חדר", "הגיע", "הלך"]
                              .filter((s) => s !== bf.fields["סטטוס"])
                              .map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setBookingStatus(bf, s, currentItem)}
                                  disabled={saving}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                                    bookingStatusBtn[s] ?? "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                                    saving && "opacity-50"
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Change room status */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">שנה סטטוס חדר:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_STATUSES.filter((s) => s !== currentItem.status).map((s) => (
                        <button
                          key={s}
                          onClick={() => setRoomStatus(currentItem, s)}
                          disabled={saving}
                          className={cn(
                            "flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-sm font-medium transition-all",
                            statusBtn[s],
                            saving && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {s === "דרוש תיקון" && <Wrench className="w-3.5 h-3.5" />}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assign to guest */}
                  <Button
                    variant="outline"
                    className="w-full rounded-xl gap-2"
                    onClick={() => setSheet({ mode: "assign", item: currentItem })}
                  >
                    הקצה לאורח
                  </Button>
                </div>
              )}

              {/* Repair form mode */}
              {sheet.mode === "repair-form" && (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-gray-600">
                    החדר יסומן כ"דרוש תיקון". אפשר להוסיף תיאור הבעיה לרשומת התיקון (לא חובה):
                  </p>
                  <Textarea
                    placeholder="תיאור הבעיה (אופציונלי)..."
                    value={repairDesc}
                    onChange={(e) => setRepairDesc(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={3}
                    dir="rtl"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-xl gap-2"
                      onClick={() => submitRepairForm(currentItem)}
                      disabled={saving}
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {repairDesc.trim() ? "שמור עם תיקון" : "עדכן סטטוס"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={closeSheet}
                      disabled={saving}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              )}

              {/* Assign mode */}
              {sheet.mode === "assign" && (
                <div className="flex flex-col" style={{ height: "60vh" }}>
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="חפש שם או טלפון..."
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        className="pr-9 rounded-xl"
                        dir="rtl"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-3 space-y-2">
                    {assignableFiles.length === 0 && (
                      <p className="text-center text-sm text-gray-400 py-8">לא נמצאו תיקים</p>
                    )}
                    {assignableFiles.map((bf) => (
                      <button
                        key={bf.id}
                        onClick={() => assignToBooking(currentItem, bf)}
                        disabled={saving}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-primary/40 hover:shadow-sm transition-all text-right"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {(bf.fields["שם איש קשר"] || "?").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{bf.fields["שם איש קשר"]}</p>
                          {bf.fields["מספר פלאפון"] && (
                            <p className="text-xs text-gray-400">{bf.fields["מספר פלאפון"]}</p>
                          )}
                        </div>
                        <StatusBadge status={bf.fields["סטטוס"] ?? "ממתין"} type="booking" size="sm" />
                        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
