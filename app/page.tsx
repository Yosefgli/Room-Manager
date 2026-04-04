export const dynamic = "force-dynamic";

import { getRooms, getBookingFiles, getRepairs, computeRoomStatus, computeBookingFileStatus } from "@/lib/airtable";
import type { RoomStatus } from "@/lib/airtable";
import { StatusBadge } from "@/components/status-badge";
import { BedDouble, FolderOpen, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const [rooms, bookingFiles, repairs] = await Promise.all([
    getRooms(),
    getBookingFiles(),
    getRepairs(),
  ]);

  const roomsWithStatus = rooms.map((room) => ({
    room,
    status: computeRoomStatus(room, repairs, bookingFiles),
  }));

  const statusCounts: Record<RoomStatus, number> = {
    פנוי: 0,
    "בשימוש": 0,
    "דרוש תיקון": 0,
    לניקוי: 0,
    שמור: 0,
  };
  roomsWithStatus.forEach(({ status }) => {
    statusCounts[status]++;
  });

  const assignedFiles = bookingFiles.filter(
    (f) => computeBookingFileStatus(f) === "הוקצה חדר"
  );
  const pendingFiles = bookingFiles.filter(
    (f) => computeBookingFileStatus(f) === "ממתין"
  );
  const openRepairs = repairs.filter((r) => r.fields["סטטוס"] !== "תוקן");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">דשבורד</h1>
        <p className="text-gray-500 text-sm mt-1">סקירה כללית של המערכת</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="סה״כ חדרים"
          value={rooms.length}
          icon={<BedDouble className="w-5 h-5 text-primary" />}
          bg="bg-primary/5"
        />
        <StatCard
          title="חדרים פנויים"
          value={statusCounts["פנוי"]}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          bg="bg-green-50"
          valueColor="text-green-600"
        />
        <StatCard
          title="תיקי בקשות"
          value={bookingFiles.length}
          icon={<FolderOpen className="w-5 h-5 text-blue-500" />}
          bg="bg-blue-50"
          valueColor="text-blue-600"
        />
        <StatCard
          title="דרוש תיקון"
          value={openRepairs.length}
          icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
          bg="bg-yellow-50"
          valueColor="text-yellow-600"
        />
      </div>

      {/* Rooms Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">מצב חדרים</h2>
          <Link href="/rooms" className="text-sm text-primary hover:underline">
            הצג הכל
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {roomsWithStatus.map(({ room, status }) => (
            <DashboardRoomTile key={room.id} name={room.fields["שם חדר"]} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {(Object.entries(statusCounts) as [RoomStatus, number][])
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <StatusBadge status={status} size="sm" />
                <span className="text-xs text-gray-400">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Bookings Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <SummarySection
          title="תיקים ממתינים"
          count={pendingFiles.length}
          href="/bookings"
          items={pendingFiles.slice(0, 5).map((f) => ({
            id: f.id,
            label: f.fields["שם איש קשר"],
            sub: f.fields["מספר פלאפון"],
            status: "ממתין",
          }))}
        />
        <SummarySection
          title="תיקים עם חדר"
          count={assignedFiles.length}
          href="/bookings"
          items={assignedFiles.slice(0, 5).map((f) => ({
            id: f.id,
            label: f.fields["שם איש קשר"],
            sub: `${f.fields["חדרי אירוח"]?.length ?? 0} חדרים`,
            status: "הוקצה חדר",
          }))}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  bg,
  valueColor = "text-gray-900",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{title}</p>
    </div>
  );
}

function DashboardRoomTile({ name, status }: { name: string; status: RoomStatus }) {
  const colorMap: Record<RoomStatus, string> = {
    פנוי: "bg-green-50 border-green-200 text-green-700",
    "בשימוש": "bg-red-50 border-red-200 text-red-700",
    "דרוש תיקון": "bg-purple-50 border-purple-200 text-purple-700",
    לניקוי: "bg-yellow-50 border-yellow-200 text-yellow-700",
    שמור: "bg-cyan-50 border-cyan-200 text-cyan-700",
  };

  return (
    <Link
      href="/rooms"
      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center gap-1 hover:shadow-sm transition-all ${colorMap[status]}`}
    >
      <span className="text-xl">🛏️</span>
      <span className="text-xs font-medium leading-tight truncate w-full">{name}</span>
      <span className="text-xs opacity-70">{status}</span>
    </Link>
  );
}

function SummarySection({
  title,
  count,
  href,
  items,
}: {
  title: string;
  count: number;
  href: string;
  items: { id: string; label: string; sub?: string; status: string }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">אין רשומות</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/bookings/${item.id}`}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                {(item.label || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                {item.sub && <p className="text-xs text-gray-400">{item.sub}</p>}
              </div>
              <StatusBadge status={item.status} type="booking" size="sm" />
            </Link>
          ))}
          {count > 5 && (
            <Link href={href} className="text-xs text-primary hover:underline block text-center pt-1">
              הצג עוד {count - 5}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
