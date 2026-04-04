"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BedDouble, FolderOpen, Wrench, History, BarChart2 } from "lucide-react";

const navItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/rooms", label: "חדרים", icon: BedDouble },
  { href: "/bookings", label: "תיקים", icon: FolderOpen },
  { href: "/repairs", label: "תיקונים", icon: Wrench },
  { href: "/history", label: "היסטוריה", icon: History },
  { href: "/usage", label: "שימוש API", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 min-h-screen bg-white border-l border-gray-100 flex-col shadow-sm shrink-0">
        <div className="px-5 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <BedDouble className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 leading-tight">ניהול אירוח</p>
              <p className="text-xs text-gray-400">מערכת פנימית</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  active ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-gray-400")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-300">גרסה 1.0</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 right-0 left-0 z-40 bg-white border-t border-gray-200 flex items-stretch h-16 shadow-lg">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-gray-400"
              )}
            >
              <Icon className={cn("w-5 h-5", active ? "text-primary" : "text-gray-400")} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
