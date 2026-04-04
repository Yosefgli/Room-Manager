// Tracks Airtable API call counts, stored in data/airtable-usage.json
// Each entry: { date: "YYYY-MM-DD", count: number }
// Settings: { cycleStartDay: number (1-28) }

import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "airtable-usage.json");

type DayEntry = { date: string; count: number };
type UsageData = {
  settings: { cycleStartDay: number };
  days: DayEntry[];
};

function readData(): UsageData {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { settings: { cycleStartDay: 1 }, days: [] };
  }
}

function writeData(data: UsageData) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function trackApiCall(count = 1) {
  const today = todayStr();
  const data = readData();
  const existing = data.days.find((d) => d.date === today);
  if (existing) {
    existing.count += count;
  } else {
    data.days.push({ date: today, count });
  }
  writeData(data);
}

export function getUsageData(): UsageData {
  return readData();
}

export function setCycleStartDay(day: number) {
  const data = readData();
  data.settings.cycleStartDay = Math.max(1, Math.min(28, day));
  writeData(data);
}

// Returns usage grouped by billing cycle
export type CycleSummary = {
  label: string;       // e.g. "מרץ 2025"
  start: string;       // YYYY-MM-DD
  end: string;         // YYYY-MM-DD
  total: number;
  days: DayEntry[];
};

export function getCycleSummaries(): { summaries: CycleSummary[]; settings: { cycleStartDay: number } } {
  const data = readData();
  const { cycleStartDay } = data.settings;
  const { days } = data;

  if (days.length === 0) {
    return { summaries: [], settings: data.settings };
  }

  // Find range
  const allDates = days.map((d) => d.date).sort();
  const firstDate = new Date(allDates[0]);
  const lastDate = new Date();

  // Build cycles from firstDate to now
  const summaries: CycleSummary[] = [];

  let cycleStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), cycleStartDay);
  // If cycleStart is after firstDate, go back one month
  if (cycleStart > firstDate) {
    cycleStart.setMonth(cycleStart.getMonth() - 1);
  }

  const HEBREW_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

  while (cycleStart <= lastDate) {
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1);

    const startStr = cycleStart.toISOString().slice(0, 10);
    const endStr = cycleEnd.toISOString().slice(0, 10);

    const cycleDays = days.filter((d) => d.date >= startStr && d.date <= endStr);
    const total = cycleDays.reduce((s, d) => s + d.count, 0);

    summaries.push({
      label: `${HEBREW_MONTHS[cycleStart.getMonth()]} ${cycleStart.getFullYear()}`,
      start: startStr,
      end: endStr,
      total,
      days: cycleDays,
    });

    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);
  }

  summaries.reverse();
  return { summaries, settings: data.settings };
}
