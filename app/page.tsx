export const dynamic = "force-dynamic";

import {
  getRooms, getBookingFiles, getRepairs,
  computeRoomStatus, computeBookingFileStatus, hasOpenRepairForRoom,
} from "@/lib/airtable";
import type { RoomStatus } from "@/lib/airtable";
import { StatusBadge } from "@/components/status-badge";
import { BedDouble, FolderOpen, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { trackApiCall } from "@/lib/usage";

export default async function DashboardPage() {
  const [rooms, bookingFiles, repairs] = await Promise.all([
    getRooms(),
    getBookingFiles(),
    getRepairs(),
  ]);
  trackApiCall(3); // getRooms + getBookingFiles + getRepairs

  const roomsWithStatus = rooms
    .map((room) => ({
      room,
      status: computeRoomStatus(room, repairs, bookingFiles),
      hasOpenRepair: hasOpenRepairForRoom(room, repairs),
    }))
    .sort((a, b) => {
      const locA = a.room.fields["מיקום"] ?? "";
      const locB = b.room.fields["מיקום"] ?? "";
      if (locA !== locB) return locA.localeCompare(locB, "he");
      return (a.room.fields["מספר"] ?? 0) - (b.room.fields["מספר"] ?? 0);
    });

  const statusCounts: Record<RoomStatus, number> = {
    פנוי: 0, "בשימוש": 0, "דרוש תיקון": 0, לניקוי: 0, שמור: 0,
  };
  roomsWithStatus.forEach(({ status }) => { statusCounts[status]++; });

  const openRepairs = repairs.filter((r) => r.fields["סטטוס"] !== "תוקן");

  const waitingFiles = bookingFiles.filter((f) => computeBookingFileStatus(f) === "ממתין");
  const assignedFiles = bookingFiles.filter((f) => computeBookingFileStatus(f) === "הוקצה חדר");
  const arrivedFiles = bookingFiles.filter((f) => computeBookingFileStatus(f) === "הגיע");

  const colorMap: Record<RoomStatus, string> = {
    פנוי: "bg-green-50 border-green-200 text-green-700",
    "בשימוש": "bg-red-50 border-red-200 text-red-700",
    "דרוש תיקון": "bg-purple-50 border-purple-200 text-purple-700",
    לניקוי: "bg-yellow-50 border-yellow-200 text-yellow-700",
    שמור: "bg-cyan-50 border-cyan-200 text-cyan-700",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">דשבורד</h1>
        <p className="text-gray-500 text-sm mt-1">סקירה כללית של המערכת</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="סה״כ חדרים" value={rooms.length} icon={<BedDouble className="w-5 h-5 text-primary" />} bg="bg-primary/5" />
        <StatCard title="חדרים פנויים" value={statusCounts["פנוי"]} icon={<CheckCircle className="w-5 h-5 text-green-500" />} bg="bg-green-50" valueColor="text-green-600" />
        <StatCard title="תיקים פעילים" value={waitingFiles.length + assignedFiles.length + arrivedFiles.length} icon={<FolderOpen className="w-5 h-5 text-blue-500" />} bg="bg-blue-50" valueColor="text-blue-600" />
        <StatCard title="דרוש תיקון" value={openRepairs.length} icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />} bg="bg-yellow-50" valueColor="text-yellow-600" />
      </div>

      {/* Rooms grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">מצב חדרים</h2>
          <Link href="/rooms" className="text-sm text-primary hover:underline">הצג הכל</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {roomsWithStatus.map(({ room, status, hasOpenRepair }) => (
            <Link
              key={room.id}
              href="/rooms"
              className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border text-center gap-0.5 hover:shadow-sm transition-all ${colorMap[status]}`}
            >
              {hasOpenRepair && status !== "דרוש תיקון" && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full" title="יש תיקון פתוח" />
              )}
              <span className="text-lg">🛏️</span>
              <span className="text-xs font-medium leading-tight truncate w-full">{room.fields["שם חדר"]}</span>
              <span className="text-[10px] opacity-70">{status}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {(Object.entries(statusCounts) as [RoomStatus, number][])
            .filter(([, c]) => c > 0)
            .map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <StatusBadge status={status} size="sm" />
                <span className="text-xs text-gray-400">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Quick actions — client component */}
      <DashboardQuickActions
        waitingFiles={waitingFiles}
        assignedFiles={assignedFiles}
        arrivedFiles={arrivedFiles}
        roomsWithStatus={roomsWithStatus}
      />
    </div>
  );
}

function StatCard({
  title, value, icon, bg, valueColor = "text-gray-900",
}: {
  title: string; value: number; icon: React.ReactNode; bg: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{title}</p>
    </div>
  );
}
