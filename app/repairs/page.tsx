import { getRepairs, getRooms } from "@/lib/airtable";
import { Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default async function RepairsPage() {
  const [repairs, rooms] = await Promise.all([getRepairs(), getRooms()]);

  const roomMap: Record<string, string> = {};
  rooms.forEach((r) => {
    roomMap[r.id] = r.fields["שם חדר"] || r.id;
  });

  const openRepairs = repairs.filter(
    (r) => r.fields["סטטוס"] !== "הושלם" && r.fields["סטטוס"] !== "סגור"
  );
  const closedRepairs = repairs.filter(
    (r) => r.fields["סטטוס"] === "הושלם" || r.fields["סטטוס"] === "סגור"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">דרוש תיקון</h1>
        <p className="text-gray-500 text-sm mt-1">
          {openRepairs.length} פתוחות · {closedRepairs.length} סגורות
        </p>
      </div>

      {/* Open */}
      {openRepairs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <h2 className="font-semibold text-sm text-gray-900">פתוחות</h2>
          </div>
          <div className="space-y-2">
            {openRepairs.map((repair) => (
              <RepairRow key={repair.id} repair={repair} roomMap={roomMap} />
            ))}
          </div>
        </section>
      )}

      {/* Closed */}
      {closedRepairs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-sm text-gray-900">סגורות</h2>
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

import type { Repair } from "@/lib/airtable";

function RepairRow({
  repair,
  roomMap,
}: {
  repair: Repair;
  roomMap: Record<string, string>;
}) {
  const rooms = repair.fields["חדרי אירוח"]?.map((id) => roomMap[id] || id) ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0 mt-0.5">
        <Wrench className="w-4 h-4 text-yellow-500" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {rooms.map((name) => (
            <span key={name} className="text-sm font-semibold text-gray-900">
              {name}
            </span>
          ))}
          {repair.fields["סטטוס"] && (
            <StatusBadge status={repair.fields["סטטוס"]} size="sm" />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{repair.fields["תיקון שנדרש"]}</p>
      </div>
    </div>
  );
}
