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
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  לניקוי: {
    label: "לניקוי",
    className: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
  שמור: {
    label: "שמור",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
};

const bookingStatusConfig: Record<string, StatusConfig> = {
  "הוקצב חדר": {
    label: "הוקצב חדר",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  ממתין: {
    label: "ממתין",
    className: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-400",
  },
};

type StatusBadgeProps = {
  status: string;
  type?: "room" | "booking";
  size?: "sm" | "md";
};

export function StatusBadge({ status, type = "room", size = "md" }: StatusBadgeProps) {
  const config =
    type === "room"
      ? (roomStatusConfig as Record<string, StatusConfig>)[status]
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
