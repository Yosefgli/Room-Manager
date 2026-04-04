"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { BookingCard } from "@/components/booking-card";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingFile, Guest, Room } from "@/lib/airtable";

type Props = {
  files: BookingFile[];
  guestCounts: Record<string, number>;
  guestsMap: Record<string, Guest[]>;
  rooms: Room[];
};

type SortKey = "newest" | "oldest" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "חדש לישן",
  oldest: "ישן לחדש",
  name: "שם",
};

export function HistoryClient({ files, guestCounts, guestsMap, rooms }: Props) {
  const [query, setQuery] = useState("");
  const [filterRoom, setFilterRoom] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Build room name map
  const roomNameMap: Record<string, string> = {};
  rooms.forEach((r) => { roomNameMap[r.id] = r.fields["שם חדר"] || r.id; });

  // Rooms that appear in history
  const usedRooms = useMemo(() => {
    const roomIds = new Set<string>();
    files.forEach((f) => f.fields["חדרי אירוח"]?.forEach((id) => roomIds.add(id)));
    return rooms.filter((r) => roomIds.has(r.id));
  }, [files, rooms]);

  const filtered = useMemo(() => {
    let result = [...files];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.fields["שם איש קשר"]?.toLowerCase().includes(q) ||
          f.fields["מספר פלאפון"]?.includes(q) ||
          f.fields["הערות"]?.toLowerCase().includes(q)
      );
    }

    if (filterRoom) {
      result = result.filter((f) => f.fields["חדרי אירוח"]?.includes(filterRoom));
    }

    result.sort((a, b) => {
      if (sort === "newest") return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
      if (sort === "oldest") return new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
      return (a.fields["שם איש קשר"] || "").localeCompare(b.fields["שם איש קשר"] || "", "he");
    });

    return result;
  }, [files, query, filterRoom, sort]);

  // When a room is selected — show guests in order for each file
  const guestsMapFiltered: Record<string, Guest[]> = useMemo(() => {
    if (!filterRoom) return guestsMap;
    // Keep guest order by file createdTime (already sorted above)
    return guestsMap;
  }, [guestsMap, filterRoom]);

  return (
    <div className="space-y-4">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם, טלפון..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 rounded-xl bg-white"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
            showFilters || filterRoom || sort !== "newest"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          סינון
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          {/* Sort */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">מיון</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                    sort === s
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Room filter */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">סנן לפי חדר</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterRoom("")}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  !filterRoom
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}
              >
                הכל
              </button>
              {usedRooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setFilterRoom(r.id === filterRoom ? "" : r.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                    filterRoom === r.id
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {r.fields["שם חדר"]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Room filter summary */}
      {filterRoom && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>חדר: <strong className="text-gray-900">{roomNameMap[filterRoom]}</strong></span>
          <span className="text-gray-400">·</span>
          <span>{filtered.length} תיקים</span>
          <span className="text-gray-400">·</span>
          <span>סדר אורחים: מהראשון (ישן) לאחרון</span>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>לא נמצאו תוצאות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file, index) => (
            <div key={file.id}>
              {filterRoom && (
                <p className="text-xs text-gray-400 mb-1 pr-1">
                  #{index + 1} · {new Date(file.createdTime).toLocaleDateString("he-IL")}
                </p>
              )}
              <BookingCard
                file={file}
                guestCount={guestCounts[file.id] ?? 0}
                guests={guestsMapFiltered[file.id] ?? []}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
