// Tracks Airtable API call counts.
// On Vercel (read-only FS): stores in /tmp — persists within the same function instance only.
// Locally: stores in data/airtable-usage.json — persists across restarts.

import fs from "fs";
import path from "path";

// /tmp is writable on Vercel; use local data/ dir otherwise
const DATA_FILE = process.env.VERCEL
  ? "/tmp/airtable-usage.json"
  : path.join(process.cwd(), "data", "airtable-usage.json");

// Settings stored separately so they survive /tmp resets on Vercel via env var fallback
const SETTINGS_FILE = process.env.VERCEL
  ? "/tmp/airtable-usage-settings.json"
  : path.join(process.cwd(), "data", "airtable-usage-settings.json");

type DayEntry = { date: string; count: number };
type UsageData = { days: DayEntry[] };
type Settings = { cycleStartDay: number };

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Silently ignore write errors (e.g. read-only FS)
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function trackApiCall(count = 1) {
  try {
    const today = todayStr();
    const data = readJson<UsageData>(DATA_FILE, { days: [] });
    const existing = data.days.find((d) => d.date === today);
    if (existing) {
      existing.count += count;
    } else {
      data.days.push({ date: today, count });
    }
    writeJson(DATA_FILE, data);
  } catch {
    // Never crash a page because of tracking
  }
}

export function getSettings(): Settings {
  // Allow overriding cycleStartDay via env var for Vercel persistence
  const envDay = process.env.USAGE_CYCLE_START_DAY ? parseInt(process.env.USAGE_CYCLE_START_DAY, 10) : null;
  const stored = readJson<Settings>(SETTINGS_FILE, { cycleStartDay: envDay ?? 1 });
  return stored;
}

export function setCycleStartDay(day: number) {
  writeJson(SETTINGS_FILE, { cycleStartDay: Math.max(1, Math.min(28, day)) });
}

export type CycleSummary = {
  label: string;
  start: string;
  end: string;
  total: number;
  days: DayEntry[];
};

export function getCycleSummaries(): { summaries: CycleSummary[]; settings: Settings } {
  const settings = getSettings();
  const data = readJson<UsageData>(DATA_FILE, { days: [] });
  const { days } = data;

  if (days.length === 0) {
    return { summaries: [], settings };
  }

  const allDates = days.map((d) => d.date).sort();
  const firstDate = new Date(allDates[0]);
  const lastDate = new Date();

  const summaries: CycleSummary[] = [];
  const HEBREW_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

  let cycleStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), settings.cycleStartDay);
  if (cycleStart > firstDate) cycleStart.setMonth(cycleStart.getMonth() - 1);

  while (cycleStart <= lastDate) {
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1);

    const startStr = cycleStart.toISOString().slice(0, 10);
    const endStr = cycleEnd.toISOString().slice(0, 10);
    const cycleDays = days.filter((d) => d.date >= startStr && d.date <= endStr);

    summaries.push({
      label: `${HEBREW_MONTHS[cycleStart.getMonth()]} ${cycleStart.getFullYear()}`,
      start: startStr,
      end: endStr,
      total: cycleDays.reduce((s, d) => s + d.count, 0),
      days: cycleDays,
    });

    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);
  }

  summaries.reverse();
  return { summaries, settings };
}
