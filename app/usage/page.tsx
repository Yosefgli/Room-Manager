export const dynamic = "force-dynamic";

import { getCycleSummaries } from "@/lib/usage";
import { UsageClient } from "@/components/usage-client";
import { BarChart2 } from "lucide-react";

export default async function UsagePage() {
  const { summaries, settings } = getCycleSummaries();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">שימוש ב-Airtable</h1>
          <p className="text-gray-500 text-sm mt-0.5">מעקב קריאות API לפי חודש חיוב</p>
        </div>
      </div>

      <UsageClient summaries={summaries} settings={settings} />
    </div>
  );
}
