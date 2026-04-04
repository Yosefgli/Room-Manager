// Airtable REST API client
// All data fetching happens server-side to keep API keys safe

const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

const headers = {
  Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
  "Content-Type": "application/json",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type AirtableRecord<T> = {
  id: string;
  fields: T;
  createdTime: string;
};

export type RoomFields = {
  "שם חדר": string;
  מספר?: number;
  קיבולת?: number;
  סטטוס?: string;
  מיקום?: string;
  "תיקי בקשות אירוח"?: string[];
};

export type BookingFileFields = {
  "שם איש קשר": string;
  "מספר פלאפון"?: string;
  "בקשות אירוח"?: string[];
  "חדרי אירוח"?: string[];
  סטטוס?: string;
  הערות?: string;
};

export type GuestFields = {
  "שם אורח": string;
  "מספר פלאפון"?: string;
};

export type RepairFields = {
  "חדרי אירוח"?: string[];
  "תיקון שנדרש": string;
  סטטוס?: string;
};

export type Room = AirtableRecord<RoomFields>;
export type BookingFile = AirtableRecord<BookingFileFields>;
export type Guest = AirtableRecord<GuestFields>;
export type Repair = AirtableRecord<RepairFields>;

// ─── Room Status Logic (computed in-app only) ─────────────────────────────

export type RoomStatus = "דרוש תיקון" | "בשימוש" | "לניקוי" | "שמור" | "פנוי";

export function computeRoomStatus(
  room: Room,
  repairs: Repair[],
  bookingFiles: BookingFile[]
): RoomStatus {
  // 1. Open repair record linked to this room
  const hasOpenRepair = repairs.some(
    (r) =>
      r.fields["חדרי אירוח"]?.includes(room.id) &&
      r.fields["סטטוס"] !== "תוקן"
  );
  if (hasOpenRepair) return "דרוש תיקון";

  // 2. Linked to any booking file
  const linkedToFile =
    room.fields["תיקי בקשות אירוח"] &&
    room.fields["תיקי בקשות אירוח"].length > 0;
  if (linkedToFile) return "בשימוש";

  // 3. Manual override for "שמור"
  if (room.fields["סטטוס"] === "שמור") return "שמור";

  // 4. Was previously linked (check bookingFiles for historical link)
  const wasLinked = bookingFiles.some((f) =>
    f.fields["חדרי אירוח"]?.includes(room.id)
  );
  if (wasLinked) return "לניקוי";

  // 5. Manual override for "לניקוי" (set explicitly but no booking history)
  if (room.fields["סטטוס"] === "לניקוי") return "לניקוי";

  return "פנוי";
}

export function computeBookingFileStatus(file: BookingFile): string {
  if (file.fields["חדרי אירוח"] && file.fields["חדרי אירוח"].length > 0) {
    return "הוקצה חדר";
  }
  return "ממתין";
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchAll<T>(table: string): Promise<AirtableRecord<T>[]> {
  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${BASE_URL}/${encodeURIComponent(table)}`);
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable error (${table}): ${err}`);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function getRooms(): Promise<Room[]> {
  return fetchAll<RoomFields>("חדרי אירוח");
}

export async function getBookingFiles(): Promise<BookingFile[]> {
  return fetchAll<BookingFileFields>("תיקי בקשות אירוח");
}

export async function getGuests(): Promise<Guest[]> {
  return fetchAll<GuestFields>("בקשות אירוח");
}

export async function getRepairs(): Promise<Repair[]> {
  return fetchAll<RepairFields>("דרוש תיקון");
}

export async function getBookingFile(id: string): Promise<BookingFile> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("תיקי בקשות אירוח")}/${id}`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch booking file");
  return res.json();
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function updateBookingFile(
  id: string,
  fields: Partial<BookingFileFields>
): Promise<BookingFile> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("תיקי בקשות אירוח")}/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to update booking file");
  return res.json();
}

export async function createBookingFile(
  fields: Partial<BookingFileFields>
): Promise<BookingFile> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("תיקי בקשות אירוח")}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to create booking file");
  return res.json();
}

export async function createGuest(
  fields: Partial<GuestFields>
): Promise<Guest> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("בקשות אירוח")}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to create guest");
  return res.json();
}

export async function updateGuest(
  id: string,
  fields: Partial<GuestFields>
): Promise<Guest> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("בקשות אירוח")}/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to update guest");
  return res.json();
}

export async function deleteGuest(id: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("בקשות אירוח")}/${id}`,
    { method: "DELETE", headers }
  );
  if (!res.ok) throw new Error("Failed to delete guest");
}

export async function updateRoom(
  id: string,
  fields: Partial<RoomFields>
): Promise<Room> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("חדרי אירוח")}/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to update room");
  return res.json();
}
