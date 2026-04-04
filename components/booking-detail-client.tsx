"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  Phone,
  BedDouble,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { computeBookingFileStatus } from "@/lib/airtable";
import type { BookingFile, Room, Guest, RoomStatus } from "@/lib/airtable";

type RoomWithStatus = { room: Room; status: RoomStatus };

type Props = {
  file: BookingFile;
  roomsWithStatus: RoomWithStatus[];
  fileGuests: Guest[];
  assignedRoomIds: string[];
  roomToFile: Record<string, string>;
};

const statusColor: Record<RoomStatus, string> = {
  פנוי: "bg-green-50 border-green-200 hover:border-green-400 text-green-800",
  "בשימוש": "bg-red-50 border-red-200 hover:border-red-400 text-red-800",
  "דרוש תיקון": "bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-800",
  לניקוי: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 text-yellow-800",
  שמור: "bg-cyan-50 border-cyan-200 hover:border-cyan-400 text-cyan-800",
};

const selectedRing: Record<RoomStatus, string> = {
  פנוי: "ring-2 ring-green-400 border-green-400",
  "בשימוש": "ring-2 ring-red-400 border-red-400",
  "דרוש תיקון": "ring-2 ring-purple-400 border-purple-400",
  לניקוי: "ring-2 ring-yellow-400 border-yellow-400",
  שמור: "ring-2 ring-cyan-400 border-cyan-400",
};

export function BookingDetailClient({
  file,
  roomsWithStatus,
  fileGuests: initialGuests,
  assignedRoomIds: initialAssigned,
  roomToFile,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Editing contact info ──────────────────────────────
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: file.fields["שם איש קשר"] || "",
    phone: file.fields["מספר פלאפון"] || "",
    notes: file.fields["הערות"] || "",
  });
  const [savingContact, setSavingContact] = useState(false);

  async function saveContact() {
    setSavingContact(true);
    try {
      const res = await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "שם איש קשר": contactForm.name,
          "מספר פלאפון": contactForm.phone || undefined,
          הערות: contactForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("פרטים עודכנו");
      setEditingContact(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בשמירת פרטים");
    } finally {
      setSavingContact(false);
    }
  }

  // ── Room allocation ───────────────────────────────────
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(
    new Set(initialAssigned)
  );
  const [roomsChanged, setRoomsChanged] = useState(false);
  const [savingRooms, setSavingRooms] = useState(false);
  const [warningRoom, setWarningRoom] = useState<string | null>(null);

  function toggleRoom(roomId: string, status: RoomStatus) {
    if (status === "בשימוש" && !selectedRooms.has(roomId)) {
      setWarningRoom(roomId);
      return;
    }
    commitToggle(roomId);
  }

  function commitToggle(roomId: string) {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
    setRoomsChanged(true);
    setWarningRoom(null);
  }

  async function saveRooms() {
    setSavingRooms(true);
    try {
      const newRoomIds = Array.from(selectedRooms);
      const prevRoomIds = new Set(initialAssigned);

      // Compute which rooms were added or removed
      const added = newRoomIds.filter((id) => !prevRoomIds.has(id));
      const removed = initialAssigned.filter((id) => !selectedRooms.has(id));

      // Update the booking file: linked rooms + computed status
      const newStatus = newRoomIds.length > 0 ? "הוקצה חדר" : "ממתין";
      const res = await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "חדרי אירוח": newRoomIds,
          "סטטוס": newStatus,
        }),
      });
      if (!res.ok) throw new Error();

      // Update status of each affected room
      // Added rooms: "שמור" (reserved) unless guest already arrived → "בשימוש"
      const newRoomStatus = fileStatus === "הגיע" ? "בשימוש" : "שמור";
      await Promise.all([
        ...added.map((id) =>
          fetch(`/api/rooms/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "סטטוס": newRoomStatus }),
          })
        ),
        // Removed rooms always go back to פנוי (correcting a mistake)
        ...removed.map((id) =>
          fetch(`/api/rooms/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "סטטוס": "פנוי" }),
          })
        ),
      ]);

      toast.success("חדרים עודכנו");
      setRoomsChanged(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון חדרים");
    } finally {
      setSavingRooms(false);
    }
  }

  // ── Guests ───────────────────────────────────────────
  const [guests, setGuests] = useState(initialGuests);
  const [guestDialog, setGuestDialog] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: "", phone: "" });
  const [savingGuest, setSavingGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<string | null>(null);
  const [editGuestForm, setEditGuestForm] = useState({ name: "", phone: "", idNumber: "" });

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!guestForm.name.trim()) return;
    setSavingGuest(true);
    try {
      // Create the guest record
      const gRes = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "שם אורח": guestForm.name.trim(),
          "מספר פלאפון": guestForm.phone.trim() || undefined,
        }),
      });
      if (!gRes.ok) throw new Error();
      const newGuest = await gRes.json();

      // Link to this booking file
      const updatedIds = [...guests.map((g) => g.id), newGuest.id];
      const fRes = await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "בקשות אירוח": updatedIds }),
      });
      if (!fRes.ok) throw new Error();

      setGuests((prev) => [...prev, newGuest]);
      setGuestForm({ name: "", phone: "" });
      setGuestDialog(false);
      toast.success("אורח נוסף");
    } catch {
      toast.error("שגיאה בהוספת אורח");
    } finally {
      setSavingGuest(false);
    }
  }

  async function removeGuest(guestId: string) {
    try {
      await fetch(`/api/guests/${guestId}`, { method: "DELETE" });
      const updatedIds = guests.filter((g) => g.id !== guestId).map((g) => g.id);
      await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "בקשות אירוח": updatedIds }),
      });
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
      toast.success("אורח הוסר");
    } catch {
      toast.error("שגיאה בהסרת אורח");
    }
  }

  async function saveGuestEdit(guestId: string) {
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "שם אורח": editGuestForm.name,
          "מספר פלאפון": editGuestForm.phone || undefined,
          "תעודת זהות": editGuestForm.idNumber || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setGuests((prev) => prev.map((g) => (g.id === guestId ? updated : g)));
      setEditingGuest(null);
      toast.success("אורח עודכן");
    } catch {
      toast.error("שגיאה בעדכון אורח");
    }
  }

  const fileStatus = computeBookingFileStatus(file);
  const [editingStatus, setEditingStatus] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const BOOKING_STATUSES = ["ממתין", "הוקצה חדר", "הגיע", "הלך"];
  const statusBtnCls: Record<string, string> = {
    ממתין: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
    "הוקצה חדר": "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
    הגיע: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    הלך: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
  };

  async function changeFileStatus(newStatus: string) {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": newStatus }),
      });
      if (!res.ok) throw new Error();

      // Cascade room statuses based on new booking status
      const roomIds = file.fields["חדרי אירוח"] ?? [];
      if (roomIds.length > 0) {
        const roomStatus =
          newStatus === "הגיע" ? "בשימוש" :
          newStatus === "הוקצה חדר" ? "שמור" :
          newStatus === "הלך" ? "לניקוי" : null;
        if (roomStatus) {
          await Promise.all(
            roomIds.map((rid) =>
              fetch(`/api/rooms/${rid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "סטטוס": roomStatus }),
              })
            )
          );
        }
      }

      toast.success("סטטוס עודכן");
      setEditingStatus(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון סטטוס");
    } finally {
      setSavingStatus(false);
    }
  }

  async function removeRoomFromBooking(roomId: string) {
    const newRoomIds = Array.from(selectedRooms).filter((id) => id !== roomId);
    setSelectedRooms(new Set(newRoomIds));
    try {
      const newStatus = newRoomIds.length > 0 ? "הוקצה חדר" : "ממתין";
      await Promise.all([
        fetch(`/api/bookings/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "חדרי אירוח": newRoomIds, "סטטוס": newStatus }),
        }),
        fetch(`/api/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "סטטוס": "פנוי" }),
        }),
      ]);
      toast.success("חדר הוסר");
      startTransition(() => router.refresh());
    } catch {
      setSelectedRooms(new Set(initialAssigned));
      toast.error("שגיאה בהסרת חדר");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {(contactForm.name || "?").charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{contactForm.name}</h1>
            <button onClick={() => setEditingStatus((v) => !v)} className="focus:outline-none">
              <StatusBadge status={fileStatus} type="booking" />
            </button>
          </div>
          {file.fields["מספר פלאפון"] && (
            <a
              href={`tel:${file.fields["מספר פלאפון"]}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mt-1"
            >
              <Phone className="w-3.5 h-3.5" />
              {file.fields["מספר פלאפון"]}
            </a>
          )}
          {editingStatus && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {BOOKING_STATUSES.filter((s) => s !== fileStatus).map((s) => (
                <button
                  key={s}
                  onClick={() => changeFileStatus(s)}
                  disabled={savingStatus}
                  className={cn(
                    "px-3 py-1 rounded-full border text-xs font-medium transition-all",
                    statusBtnCls[s] ?? "bg-gray-50 border-gray-200 text-gray-700"
                  )}
                >
                  {savingStatus ? <Loader2 className="w-3 h-3 animate-spin inline" /> : s}
                </button>
              ))}
              <button onClick={() => setEditingStatus(false)} className="px-2 py-1 rounded-full text-xs text-gray-400 hover:bg-gray-100">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Contact Info */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">פרטי איש קשר</h2>
          {!editingContact ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-xl text-gray-500"
              onClick={() => setEditingContact(true)}
            >
              <Edit2 className="w-3.5 h-3.5" />
              עריכה
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-gray-400"
                onClick={() => {
                  setEditingContact(false);
                  setContactForm({
                    name: file.fields["שם איש קשר"] || "",
                    phone: file.fields["מספר פלאפון"] || "",
                    notes: file.fields["הערות"] || "",
                  });
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                className="rounded-xl gap-1.5"
                onClick={saveContact}
                disabled={savingContact}
              >
                {savingContact ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                שמור
              </Button>
            </div>
          )}
        </div>

        {editingContact ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>שם איש קשר</Label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>מספר פלאפון</Label>
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded-xl"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>הערות</Label>
              <Textarea
                value={contactForm.notes}
                onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <dl className="space-y-3">
            <InfoRow label="שם" value={file.fields["שם איש קשר"]} />
            <InfoRow label="טלפון" value={file.fields["מספר פלאפון"]} />
            {file.fields["הערות"] && (
              <InfoRow label="הערות" value={file.fields["הערות"]} />
            )}
          </dl>
        )}
      </section>

      {/* Room Allocation */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">הקצאת חדרים</h2>
            {selectedRooms.size > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {selectedRooms.size} נבחרו
              </span>
            )}
          </div>
          {roomsChanged && (
            <Button
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={saveRooms}
              disabled={savingRooms}
            >
              {savingRooms ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              שמור שינויים
            </Button>
          )}
        </div>

        {/* Assigned rooms chips with remove button */}
        {selectedRooms.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {Array.from(selectedRooms).map((roomId) => {
              const roomItem = roomsWithStatus.find((r) => r.room.id === roomId);
              if (!roomItem) return null;
              return (
                <div key={roomId} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                  <span className="font-medium text-primary text-xs">{roomItem.room.fields["שם חדר"]}</span>
                  <button
                    onClick={() => removeRoomFromBooking(roomId)}
                    className="p-0.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    title="הסר חדר"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
          <LegendItem color="bg-green-400" label="פנוי" />
          <LegendItem color="bg-red-400" label="בשימוש" />
          <LegendItem color="bg-purple-400" label="דרוש תיקון" />
          <LegendItem color="bg-yellow-400" label="לניקוי" />
          <LegendItem color="bg-cyan-400" label="שמור" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {roomsWithStatus.map(({ room, status }) => {
            const isSelected = selectedRooms.has(room.id);
            return (
              <button
                key={room.id}
                onClick={() => toggleRoom(room.id, status)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center gap-1 transition-all duration-150 cursor-pointer",
                  statusColor[status],
                  isSelected && selectedRing[status],
                  "active:scale-95"
                )}
              >
                {isSelected && (
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <span className="text-lg">🛏️</span>
                <span className="text-xs font-semibold leading-tight line-clamp-1 w-full">
                  {room.fields["שם חדר"]}
                </span>
                {room.fields["קיבולת"] && (
                  <span className="text-xs opacity-60">
                    {room.fields["קיבולת"]} מקומות
                  </span>
                )}
                <StatusBadge status={status} size="sm" />
              </button>
            );
          })}
        </div>

        {/* Warning dialog */}
        {warningRoom && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-red-700">חדר זה כבר בשימוש</p>
              <p className="text-red-500 text-xs mt-0.5">
                {roomToFile[warningRoom]
                  ? `משויך לתיק: ${roomToFile[warningRoom]}`
                  : "החדר משויך לתיק אחר"}
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-xl h-7 text-xs"
                  onClick={() => commitToggle(warningRoom)}
                >
                  בכל זאת בחר
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-7 text-xs"
                  onClick={() => setWarningRoom(null)}
                >
                  ביטול
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Guests */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">אורחים</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {guests.length}
            </span>
          </div>
          <Dialog open={guestDialog} onOpenChange={setGuestDialog}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" className="rounded-xl gap-1.5" />}
            >
              <Plus className="w-3.5 h-3.5" />
              הוסף אורח
            </DialogTrigger>
            <DialogContent className="rounded-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>הוספת אורח</DialogTitle>
              </DialogHeader>
              <form onSubmit={addGuest} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>שם אורח *</Label>
                  <Input
                    value={guestForm.name}
                    onChange={(e) => setGuestForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="שם מלא"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>מספר פלאפון</Label>
                  <Input
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="050-0000000"
                    className="rounded-xl"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGuestDialog(false)}
                    className="rounded-xl"
                  >
                    ביטול
                  </Button>
                  <Button type="submit" disabled={savingGuest} className="rounded-xl gap-2">
                    {savingGuest && <Loader2 className="w-4 h-4 animate-spin" />}
                    הוסף
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {guests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">אין אורחים רשומים</p>
        ) : (
          <div className="space-y-2">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 group"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">
                  {(guest.fields["שם אורח"] || "?").charAt(0)}
                </div>

                {editingGuest === guest.id ? (
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    <Input
                      value={editGuestForm.name}
                      onChange={(e) =>
                        setEditGuestForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="h-7 text-sm rounded-lg flex-1 min-w-24"
                      placeholder="שם"
                    />
                    <Input
                      value={editGuestForm.phone}
                      onChange={(e) =>
                        setEditGuestForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="h-7 text-sm rounded-lg w-28"
                      dir="ltr"
                      placeholder="טלפון"
                    />
                    <Input
                      value={editGuestForm.idNumber}
                      onChange={(e) =>
                        setEditGuestForm((f) => ({ ...f, idNumber: e.target.value }))
                      }
                      className="h-7 text-sm rounded-lg w-28"
                      dir="ltr"
                      placeholder="ת.ז."
                    />
                    <button
                      onClick={() => saveGuestEdit(guest.id)}
                      className="p-1 rounded-lg text-green-600 hover:bg-green-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingGuest(null)}
                      className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {guest.fields["שם אורח"]}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {guest.fields["מספר פלאפון"] && (
                          <p className="text-xs text-gray-400">{guest.fields["מספר פלאפון"]}</p>
                        )}
                        {guest.fields["תעודת זהות"] && (
                          <p className="text-xs text-gray-400">ת.ז. {guest.fields["תעודת זהות"]}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingGuest(guest.id);
                          setEditGuestForm({
                            name: guest.fields["שם אורח"] || "",
                            phone: guest.fields["מספר פלאפון"] || "",
                            idNumber: guest.fields["תעודת זהות"] || "",
                          });
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeGuest(guest.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-sm text-gray-500 w-20 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value}</dd>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}
