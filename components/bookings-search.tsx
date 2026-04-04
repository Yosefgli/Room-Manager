"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { BookingCard } from "@/components/booking-card";
import { Search } from "lucide-react";
import type { BookingFile, Guest } from "@/lib/airtable";

type Props = {
  files: BookingFile[];
  guestCounts: Record<string, number>;
  guestsMap?: Record<string, Guest[]>;
};

export function BookingsSearch({ files, guestCounts, guestsMap = {} }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.trim().toLowerCase();
    return files.filter(
      (f) =>
        f.fields["שם איש קשר"]?.toLowerCase().includes(q) ||
        f.fields["מספר פלאפון"]?.includes(q) ||
        f.fields["הערות"]?.toLowerCase().includes(q)
    );
  }, [files, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="חיפוש לפי שם, טלפון..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-9 rounded-xl bg-white"
          dir="rtl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>לא נמצאו תוצאות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => (
            <BookingCard
              key={file.id}
              file={file}
              guestCount={guestCounts[file.id] ?? 0}
              guests={guestsMap[file.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
