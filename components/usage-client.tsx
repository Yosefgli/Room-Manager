"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, Settings2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CycleSummary } from "@/lib/usage";

type Props = {
  summaries: CycleSummary[];
  settings: { cycleStartDay: number };
};

export function UsageClient({ summaries, settings }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expandedCycle, setExpandedCycle] = useState<string | null>(summaries[0]?.label ?? null);
  const [showSettings, setShowSettings] = useState(false);
  const [cycleDay, setCycleDay] = useState(String(settings.cycleStartDay));
  const [saving, setSaving] = useState(false);

  async function saveCycleDay() {
    const day = parseInt(cycleDay, 10);
    if (isNaN(day) || day < 1 || day > 28) {
      toast.error("יום חייב להיות בין 1 ל-28");
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/usage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleStartDay: day }),
      });
      toast.success("הגדרות נשמרו");
      setShowSettings(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  const maxTotal = Math.max(...summaries.map((s) => s.total), 1);

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary"
        >
          <Settings2 className="w-4 h-4" />
          הגדרות מחזור חיוב
          <ChevronDown className={cn("w-4 h-4 transition-transform", showSettings && "rotate-180")} />
        </button>

        {showSettings && (
          <div className="mt-3 flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">יום תחילת החודש (1–28)</label>
              <Input
                type="number"
                min={1}
                max={28}
                value={cycleDay}
                onChange={(e) => setCycleDay(e.target.value)}
                className="w-24 rounded-xl"
                dir="ltr"
              />
            </div>
            <Button onClick={saveCycleDay} disabled={saving} className="rounded-xl gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              שמור
            </Button>
          </div>
        )}
      </div>

      {/* No data */}
      {summaries.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>אין נתוני שימוש עדיין</p>
        </div>
      )}

      {/* Cycles */}
      {summaries.map((cycle) => {
        const isExpanded = expandedCycle === cycle.label;
        const pct = Math.round((cycle.total / maxTotal) * 100);

        return (
          <div key={cycle.label} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedCycle(isExpanded ? null : cycle.label)}
              className="w-full p-4 flex items-center gap-4 text-right hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 text-sm">{cycle.label}</span>
                  <span className="text-sm font-bold text-primary">{cycle.total.toLocaleString()}</span>
                </div>
                {/* Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>{cycle.start}</span>
                  <span>{cycle.end}</span>
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", isExpanded && "rotate-180")} />
            </button>

            {isExpanded && cycle.days.length > 0 && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                <p className="text-xs text-gray-400 mb-2">{cycle.days.length} ימים עם פעילות</p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {[...cycle.days]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((d) => {
                      const dayPct = Math.round((d.count / Math.max(...cycle.days.map((x) => x.count), 1)) * 100);
                      return (
                        <div key={d.date} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-24 shrink-0 text-left" dir="ltr">{d.date}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-primary/60 h-1.5 rounded-full"
                              style={{ width: `${dayPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-10 text-left shrink-0" dir="ltr">
                            {d.count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
