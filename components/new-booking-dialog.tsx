"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NewBookingDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "שם איש קשר": form.name.trim(),
          "מספר פלאפון": form.phone.trim() || undefined,
          הערות: form.notes.trim() || undefined,
          "סטטוס": "ממתין",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("תיק נוצר בהצלחה");
      setOpen(false);
      setForm({ name: "", phone: "", notes: "" });
      router.refresh();
    } catch {
      toast.error("שגיאה ביצירת התיק");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button className="rounded-xl gap-2" size="sm" />}
      >
        <Plus className="w-4 h-4" />
        תיק חדש
      </DialogTrigger>
      <DialogContent className="rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>תיק בקשת אירוח חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">שם איש קשר *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="שם מלא"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">מספר פלאפון</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="050-0000000"
              className="rounded-xl"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="הערות נוספות..."
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              ביטול
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              צור תיק
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
