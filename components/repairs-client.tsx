"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { Wrench, AlertTriangle, CheckCircle, Plus, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Repair, Room } from "@/lib/airtable";

type Props = {
  repairs: Repair[];
  rooms: Room[];
};

export function RepairsClient({ repairs, rooms }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const roomMap: Record<string, string> = {};
  rooms.forEach((r) => { roomMap[r.id] = r.fields["שם חדר"] || r.id; });

  const filteredRooms = rooms
    .filter((r) => !roomSearch || r.fields["שם חדר"]?.toLowerCase().includes(roomSearch.toLowerCase()))
    .sort((a, b) => {
      const locA = a.fields["מיקום"] ?? "";
      const locB = b.fields["מיקום"] ?? "";
      if (locA !== locB) return locA.localeCompare(locB, "he");
      return (a.fields["מספר"] ?? 0) - (b.fields["מספר"] ?? 0);
    });

  const openRepairs = repairs.filter((r) => r.fields["סטטוס"] !== "תוקן");
  const closedRepairs = repairs.filter((r) => r.fields["סטטוס"] === "תוקן");

  async function addRepair() {
    if (!desc.trim()) { toast.error("הכנס תיאור תיקון"); return; }
    setSaving("new");
    try {
      await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "תיקון שנדרש": desc.trim(),
          ...(selectedRoomId ? { "חדרי אירוח": [selectedRoomId] } : {}),
          "סטטוס": "דרוש תיקון",
        }),
      });
      // If room selected → also update room status to "דרוש תיקון"
      if (selectedRoomId) {
        await fetch(`/api/rooms/${selectedRoomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "סטטוס": "דרוש תיקון" }),
        });
      }
      toast.success("תיקון נוסף");
      setDesc("");
      setSelectedRoomId("");
      setRoomSearch("");
      setShowForm(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בהוספת תיקון");
    } finally {
      setSaving(null);
    }
  }

  async function markFixed(repair: Repair) {
    setSaving(repair.id);
    try {
      await fetch(`/api/repairs/${repair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "סטטוס": "תוקן" }),
      });
      // For each linked room stored as "דרוש תיקון" → check if any other open repairs remain
      const linkedRoomIds = repair.fields["חדרי אירוח"] ?? [];
      for (const rid of linkedRoomIds) {
        const otherOpenRepairs = repairs.filter(
          (r) => r.id !== repair.id && r.fields["חדרי אירוח"]?.includes(rid) && r.fields["סטטוס"] !== "תוקן"
        );
        if (otherOpenRepairs.length === 0) {
          // No more open repairs for this room — update room to פנוי
          const room = rooms.find((r) => r.id === rid);
          if (room?.fields["סטטוס"] === "דרוש תיקון") {
            await fetch(`/api/rooms/${rid}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "סטטוס": "פנוי" }),
            });
          }
        }
      }
      toast.success("תיקון סומן כתוקן");
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">דרוש תיקון</h1>
          <p className="text-gray-500 text-sm mt-1">
            {openRepairs.length} פתוחות · {closedRepairs.length} סגורות
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl gap-2" size="sm">
          <Plus className="w-4 h-4" />
          הוסף תיקון
        </Button>
      </div>

      {/* Add repair form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">תיקון חדש</p>
            <button onClick={() => { setShowForm(false); setDesc(""); setSelectedRoomId(""); setRoomSearch(""); }} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Room search + select */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">חדר (אופציונלי)</label>
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חפש חדר..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="pr-9 rounded-xl text-sm"
                dir="rtl"
              />
            </div>
            {roomSearch && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 bg-white">
                {filteredRooms.slice(0, 10).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRoomId(r.id); setRoomSearch(r.fields["שם חדר"] || ""); }}
                    className={cn(
                      "w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between",
                      selectedRoomId === r.id && "bg-primary/5 text-primary"
                    )}
                  >
                    <span>{r.fields["שם חדר"]}</span>
                    <span className="text-xs text-gray-400">{r.fields["מיקום"] ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedRoomId && !roomSearch.includes(rooms.find(r => r.id === selectedRoomId)?.fields["שם חדר"] ?? "") && (
              <p className="text-xs text-primary mt-1">
                נבחר: {rooms.find(r => r.id === selectedRoomId)?.fields["שם חדר"]}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">תיאור הבעיה *</label>
            <Textarea
              placeholder="תאר את הבעיה..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
              dir="rtl"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={addRepair} disabled={saving === "new" || !desc.trim()} className="flex-1 rounded-xl gap-2">
              {saving === "new" && <Loader2 className="w-4 h-4 animate-spin" />}
              הוסף
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setDesc(""); setSelectedRoomId(""); setRoomSearch(""); }} className="rounded-xl">
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Open repairs */}
      {openRepairs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <h2 className="font-semibold text-sm text-gray-900">פתוחות ({openRepairs.length})</h2>
          </div>
          <div className="space-y-2">
            {openRepairs.map((repair) => (
              <RepairRow
                key={repair.id}
                repair={repair}
                roomMap={roomMap}
                onMarkFixed={() => markFixed(repair)}
                saving={saving === repair.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Closed repairs */}
      {closedRepairs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-sm text-gray-900">סגורות ({closedRepairs.length})</h2>
          </div>
          <div className="space-y-2 opacity-60">
            {closedRepairs.map((repair) => (
              <RepairRow key={repair.id} repair={repair} roomMap={roomMap} />
            ))}
          </div>
        </section>
      )}

      {repairs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔧</p>
          <p>אין רשומות תיקון</p>
        </div>
      )}
    </div>
  );
}

function RepairRow({
  repair,
  roomMap,
  onMarkFixed,
  saving,
}: {
  repair: Repair;
  roomMap: Record<string, string>;
  onMarkFixed?: () => void;
  saving?: boolean;
}) {
  const roomNames = repair.fields["חדרי אירוח"]?.map((id) => roomMap[id] || id) ?? [];
  const isOpen = repair.fields["סטטוס"] !== "תוקן";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", isOpen ? "bg-purple-50" : "bg-gray-50")}>
        <Wrench className={cn("w-4 h-4", isOpen ? "text-purple-500" : "text-gray-400")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {roomNames.map((name) => (
            <span key={name} className="text-sm font-semibold text-gray-900">{name}</span>
          ))}
          {repair.fields["סטטוס"] && (
            <StatusBadge status={repair.fields["סטטוס"]} type="repair" size="sm" />
          )}
        </div>
        <p className="text-sm text-gray-600">{repair.fields["תיקון שנדרש"]}</p>
      </div>
      {isOpen && onMarkFixed && (
        <Button
          size="sm"
          variant="outline"
          onClick={onMarkFixed}
          disabled={saving}
          className="rounded-xl gap-1.5 shrink-0 text-green-600 border-green-200 hover:bg-green-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          תוקן
        </Button>
      )}
    </div>
  );
}
