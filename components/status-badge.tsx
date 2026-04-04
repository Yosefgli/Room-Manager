import { cn } from "@/lib/utils";
import type { RoomStatus } from "@/lib/airtable";

type StatusConfig = {
  label: string;
  className: string;
  dot: string;
};

const roomStatusConfig: Record<RoomStatus, StatusConfig> = {
  פנוי: {
    label: "פנוי",
    className: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  "בשימוש": {
    label: "בשימוש",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  "דרוש תיקון": {
    label: "דרוש תיקון",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  לניקוי: {
    label: "לניקוי",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  שמור: {
    label: "שמור",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
};

const bookingStatusConfig: Record<string, StatusConfig> = {
  "הוקצה חדר": {
    label: "הוקצה חדר",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  ממתין: {
    label: "ממתין",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  הגיע: {
    label: "הגיע",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  הלך: {
    label: "הלך",
    className: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

const repairStatusConfig: Record<string, StatusConfig> = {
  "דרוש תיקון": {
    label: "דרוש תיקון",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  תוקן: {
    label: "תוקן",
    className: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

type StatusBadgeProps = {
  status: string;
  type?: "room" | "booking" | "repair";
  size?: "sm" | "md";
};

export function StatusBadge({ status, type = "room", size = "md" }: StatusBadgeProps) {
  const config =
    type === "room"
      ? (roomStatusConfig as Record<string, StatusConfig>)[status]
      : type === "repair"
        ? repairStatusConfig[status]
        : bookingStatusConfig[status];

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}

export function RoomColorDot({ status }: { status: RoomStatus }) {
  const config = roomStatusConfig[status];
  if (!config) return null;
  return <span className={cn("w-2.5 h-2.5 rounded-full inline-block", config.dot)} />;
}
