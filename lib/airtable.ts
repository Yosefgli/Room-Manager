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
  "מספר הזמנה"?: number;
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

const VALID_ROOM_STATUSES: RoomStatus[] = ["דרוש תיקון", "בשימוש", "לניקוי", "שמור", "פנוי"];

export function computeRoomStatus(
  room: Room,
  repairs: Repair[],
  bookingFiles: BookingFile[]
): RoomStatus {
  const stored = room.fields["סטטוס"];

  // Trust stored status unless it is "דרוש תיקון" (which depends on live repair records)
  if (stored && stored !== "דרוש תיקון" && VALID_ROOM_STATUSES.includes(stored as RoomStatus)) {
    return stored as RoomStatus;
  }

  // For "דרוש תיקון" or no stored status: check open repairs
  const hasOpenRepair = repairs.some(
    (r) => r.fields["חדרי אירוח"]?.includes(room.id) && r.fields["סטטוס"] !== "תוקן"
  );
  if (hasOpenRepair) return "דרוש תיקון";

  // Repairs all fixed — compute from relationships
  if (room.fields["תיקי בקשות אירוח"]?.length) return "בשימוש";
  if (bookingFiles.some((f) => f.fields["חדרי אירוח"]?.includes(room.id))) return "לניקוי";
  return "פנוי";
}

export function hasOpenRepairForRoom(room: Room, repairs: Repair[]): boolean {
  return repairs.some(
    (r) => r.fields["חדרי אירוח"]?.includes(room.id) && r.fields["סטטוס"] !== "תוקן"
  );
}

const VALID_BOOKING_STATUSES = ["ממתין", "הוקצה חדר", "הגיע", "הלך"];

export function computeBookingFileStatus(file: BookingFile): string {
  const stored = file.fields["סטטוס"];
  if (stored && VALID_BOOKING_STATUSES.includes(stored)) return stored;
  if (file.fields["חדרי אירוח"]?.length) return "הוקצה חדר";
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

export async function createRepair(
  fields: Partial<RepairFields>
): Promise<Repair> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("דרוש תיקון")}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to create repair");
  return res.json();
}

export async function updateRepair(
  id: string,
  fields: Partial<RepairFields>
): Promise<Repair> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent("דרוש תיקון")}/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error("Failed to update repair");
  return res.json();
}
