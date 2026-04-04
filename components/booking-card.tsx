"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, BedDouble, Users, ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import Image from "next/image";
import { StatusBadge } from "./status-badge";
import { computeBookingFileStatus } from "@/lib/airtable";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BookingFile, Guest } from "@/lib/airtable";

type BookingCardProps = {
  file: BookingFile;
  guestCount?: number;
  guests?: Guest[];
};

const BOOKING_STATUSES = ["ממתין", "הוקצה חדר", "הגיע", "הלך"];

const statusBtnCls: Record<string, string> = {
  ממתין: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
  "הוקצה חדר": "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
  הגיע: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
  הלך: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
};

export function BookingCard({ file, guestCount = 0, guests = [] }: BookingCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingStatus, setEditingStatus] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [saving, setSaving] = useState(false);

  const status = computeBookingFileStatus(file);
  const roomCount = file.fields["חדרי אירוח"]?.length ?? 0;

  async function changeStatus(newStatus: string) {
    setSaving(true);
    try {
      await fetch(`/api/bookings/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": newStatus }),
      });

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
      toast.error("שגיאה בעדכון");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:border-primary/30 transition-all duration-150 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <button
            onClick={() => router.push(`/bookings/${file.id}`)}
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
          >
            {(file.fields["שם איש קשר"] || "?").charAt(0)}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/bookings/${file.id}`)}
                className="font-semibold text-gray-900 text-sm truncate hover:text-primary"
              >
                {file.fields["שם איש קשר"] || "ללא שם"}
              </button>
              <button onClick={() => setEditingStatus((v) => !v)} className="focus:outline-none">
                <StatusBadge status={status} type="booking" size="sm" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                <button
                  onClick={() => setShowGuests((v) => !v)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
                >
                  <Users className="w-3 h-3" />
                  {guestCount} אורחים
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showGuests && "rotate-180")} />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push(`/bookings/${file.id}`)}
            className="p-1 rounded-lg hover:bg-gray-50 shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors rotate-180" />
          </button>
        </div>

        {file.fields["הערות"] && (
          <p className="mt-2 text-xs text-gray-400 line-clamp-1 pr-13">
            {file.fields["הערות"]}
          </p>
        )}

        {/* Status change buttons */}
        {editingStatus && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {BOOKING_STATUSES.filter((s) => s !== status).map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={saving}
                className={cn(
                  "px-3 py-1 rounded-full border text-xs font-medium transition-all disabled:opacity-50",
                  statusBtnCls[s]
                )}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : s}
              </button>
            ))}
            <button
              onClick={() => setEditingStatus(false)}
              className="px-2 py-1 rounded-full text-xs text-gray-400 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Guest list */}
      {showGuests && guests.length > 0 && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {guests.map((guest) => (
            <div key={guest.id} className="px-4 py-2.5 flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">
                {(guest.fields["שם אורח"] || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{guest.fields["שם אורח"]}</p>
                {guest.fields["מספר פלאפון"] && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {guest.fields["מספר פלאפון"]}
                  </p>
                )}
              </div>
              {guest.fields["תעודת זהות"]?.[0] && (
                <a
                  href={guest.fields["תעודת זהות"][0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={guest.fields["תעודת זהות"][0].thumbnails?.small?.url ?? guest.fields["תעודת זהות"][0].url}
                    alt="תעודת זהות"
                    width={48}
                    height={32}
                    className="rounded-lg object-cover border border-gray-200"
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
