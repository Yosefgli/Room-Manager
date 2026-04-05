"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import {
  KeyRound,
  LogIn,
  LogOut,
  User,
  ArrowRight,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  BedDouble,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────

type ScanMode = "key-checkin" | "key-checkout" | "guest";

type ScanStep = "select-mode" | "scanning" | "result";

type KeyResult = {
  success: boolean;
  roomName?: string;
  roomNumber?: number;
  newStatus?: string;
  message?: string;
  error?: string;
};

type GuestRoom = {
  id: string;
  name: string;
  number?: number;
  status: string;
};

type GuestResult = {
  success: boolean;
  booking?: {
    id: string;
    contactName: string;
    phone?: string;
    status: string;
  };
  rooms?: GuestRoom[];
  error?: string;
};

// ── Component ───────────────────────────────────────────────────

export function ScanClient() {
  const [step, setStep] = useState<ScanStep>("select-mode");
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanKey, setScanKey] = useState(0); // force remount scanner

  // Key result
  const [keyResult, setKeyResult] = useState<KeyResult | null>(null);

  // Guest result
  const [guestResult, setGuestResult] = useState<GuestResult | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function selectMode(m: ScanMode) {
    setMode(m);
    setStep("scanning");
    setKeyResult(null);
    setGuestResult(null);
    setScanKey((k) => k + 1);
  }

  function backToModes() {
    setStep("select-mode");
    setMode(null);
    setKeyResult(null);
    setGuestResult(null);
  }

  function scanAgain() {
    setStep("scanning");
    setKeyResult(null);
    setGuestResult(null);
    setScanKey((k) => k + 1);
  }

  // ── Handle scanned QR ─────────────────────────────────────────

  async function handleScan(decodedText: string) {
    if (!mode) return;

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, value: decodedText.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (mode === "guest") {
          setGuestResult({ success: false, error: data.error });
        } else {
          setKeyResult({ success: false, error: data.error });
        }
        setStep("result");
        return;
      }

      if (mode === "guest") {
        setGuestResult(data);
      } else {
        setKeyResult(data);
      }
      setStep("result");
    } catch {
      toast.error("שגיאה בתקשורת עם השרת");
      // Go back to scanning on error
      setScanKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  // ── Guest actions ────────────────────────────────────────────

  async function handleRoomCheckin(roomId: string) {
    if (!guestResult?.booking) return;
    setActionLoading(roomId);
    try {
      const res = await fetch("/api/scan/guest-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "room-checkin",
          bookingId: guestResult.booking.id,
          roomId,
        }),
      });
      if (!res.ok) throw new Error();

      // Update local state
      setGuestResult((prev) => {
        if (!prev?.rooms) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, status: "בשימוש" } : r
          ),
        };
      });
      toast.success("חדר סומן כ\"בשימוש\"");
    } catch {
      toast.error("שגיאה בעדכון חדר");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGuestArrived() {
    if (!guestResult?.booking) return;
    setActionLoading("guest-arrived");
    try {
      const res = await fetch("/api/scan/guest-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "guest-arrived",
          bookingId: guestResult.booking.id,
        }),
      });
      if (!res.ok) throw new Error();

      // Update local state - all rooms to "בשימוש" and booking to "הגיע"
      setGuestResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          booking: prev.booking
            ? { ...prev.booking, status: "הגיע" }
            : prev.booking,
          rooms: prev.rooms?.map((r) => ({ ...r, status: "בשימוש" })),
        };
      });
      toast.success("האורח סומן כ\"הגיע\" — כל החדרים עודכנו");
    } catch {
      toast.error("שגיאה בעדכון סטטוס");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== "select-mode" && (
          <button
            onClick={backToModes}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">סריקת QR</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {step === "select-mode" && "בחר מצב סריקה"}
            {step === "scanning" && mode === "key-checkin" && "סרוק מפתח — כניסת אורח"}
            {step === "scanning" && mode === "key-checkout" && "סרוק מפתח — עזיבת אורח"}
            {step === "scanning" && mode === "guest" && "סרוק QR אורח"}
            {step === "result" && "תוצאת סריקה"}
          </p>
        </div>
      </div>

      {/* ── Step 1: Mode Selection ─────────────────────────────── */}
      {step === "select-mode" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ModeCard
            icon={<LogIn className="w-7 h-7" />}
            title="כניסת אורח"
            description="סריקת מפתח לסימון הגעה"
            color="green"
            onClick={() => selectMode("key-checkin")}
          />
          <ModeCard
            icon={<LogOut className="w-7 h-7" />}
            title="עזיבת אורח"
            description="סריקת מפתח לסימון עזיבה"
            color="red"
            onClick={() => selectMode("key-checkout")}
          />
          <ModeCard
            icon={<User className="w-7 h-7" />}
            title="סריקת אורח"
            description="הצגת חדרים וסימון הגעה"
            color="blue"
            onClick={() => selectMode("guest")}
          />
        </div>
      )}

      {/* ── Step 2: Scanning ───────────────────────────────────── */}
      {step === "scanning" && mode && (
        <div className="flex-1 flex flex-col items-center">
          <QrScanner
            key={scanKey}
            onScan={handleScan}
            mode={mode}
          />
          {loading && (
            <div className="mt-4 flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">מעבד סריקה...</span>
            </div>
          )}
          <button
            onClick={backToModes}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לבחירת מצב
          </button>
        </div>
      )}

      {/* ── Step 3: Key Result ─────────────────────────────────── */}
      {step === "result" && mode !== "guest" && keyResult && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm">
            {keyResult.success ? (
              <div className="text-center space-y-4">
                <div
                  className={cn(
                    "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
                    mode === "key-checkin"
                      ? "bg-green-50 text-green-500"
                      : "bg-yellow-50 text-yellow-500"
                  )}
                >
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {mode === "key-checkin" ? "כניסה נרשמה!" : "עזיבה נרשמה!"}
                  </h2>
                  <p className="text-gray-500 mt-1">{keyResult.message}</p>
                </div>
                <div
                  className={cn(
                    "p-4 rounded-2xl border",
                    mode === "key-checkin"
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-5 h-5 text-gray-500" />
                      <span className="font-semibold text-gray-900">
                        {keyResult.roomName}
                      </span>
                    </div>
                    <StatusBadge status={keyResult.newStatus ?? ""} />
                  </div>
                  {keyResult.roomNumber && (
                    <p className="text-xs text-gray-400 mt-1">
                      חדר מספר {keyResult.roomNumber}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-red-50 text-red-500">
                  <XCircle className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">שגיאה</h2>
                  <p className="text-red-500 mt-1">
                    {keyResult.error || "אירעה שגיאה בסריקה"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={scanAgain}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                סרוק שוב
              </button>
              <button
                onClick={backToModes}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Guest Result ───────────────────────────────── */}
      {step === "result" && mode === "guest" && guestResult && (
        <div className="flex-1">
          <div className="w-full max-w-md mx-auto space-y-4">
            {guestResult.success && guestResult.booking ? (
              <>
                {/* Guest info card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {(guestResult.booking.contactName || "?").charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-gray-900">
                        {guestResult.booking.contactName}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge
                          status={guestResult.booking.status ?? "ממתין"}
                          type="booking"
                          size="sm"
                        />
                        {guestResult.booking.phone && (
                          <span className="text-xs text-gray-400">
                            {guestResult.booking.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mark guest as arrived button */}
                {guestResult.booking.status !== "הגיע" &&
                  guestResult.booking.status !== "הלך" && (
                    <button
                      onClick={handleGuestArrived}
                      disabled={actionLoading !== null}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl font-medium text-sm transition-all",
                        "bg-gradient-to-l from-green-500 to-emerald-600 text-white shadow-sm hover:shadow-md",
                        actionLoading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {actionLoading === "guest-arrived" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      סמן הגעה (כל החדרים ל&quot;בשימוש&quot;)
                    </button>
                  )}

                {/* Rooms list */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    חדרים ({guestResult.rooms?.length ?? 0})
                  </h3>
                  <div className="space-y-2">
                    {guestResult.rooms?.map((room) => (
                      <div
                        key={room.id}
                        className="bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                          <BedDouble className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {room.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={room.status} size="sm" />
                            {room.number && (
                              <span className="text-xs text-gray-400">
                                מספר {room.number}
                              </span>
                            )}
                          </div>
                        </div>
                        {room.status !== "בשימוש" && (
                          <button
                            onClick={() => handleRoomCheckin(room.id)}
                            disabled={actionLoading !== null}
                            className={cn(
                              "px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                              "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
                              actionLoading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {actionLoading === room.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "בשימוש"
                            )}
                          </button>
                        )}
                        {room.status === "בשימוש" && (
                          <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-lg">
                            ✓ פעיל
                          </span>
                        )}
                      </div>
                    ))}
                    {(!guestResult.rooms || guestResult.rooms.length === 0) && (
                      <p className="text-center text-sm text-gray-400 py-4">
                        אין חדרים מקושרים לתיק זה
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-red-50 text-red-500">
                  <XCircle className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">שגיאה</h2>
                  <p className="text-red-500 mt-1">
                    {guestResult.error || "אירעה שגיאה בסריקה"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4 pt-2">
              <button
                onClick={scanAgain}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                סרוק שוב
              </button>
              <button
                onClick={backToModes}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mode Selection Card ─────────────────────────────────────────

function ModeCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "green" | "red" | "blue";
  onClick: () => void;
}) {
  const colors = {
    green: "bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-300 hover:shadow-green-100",
    red: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:shadow-red-100",
    blue: "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 hover:shadow-blue-100",
  };

  const iconBg = {
    green: "bg-green-100",
    red: "bg-red-100",
    blue: "bg-blue-100",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.98]",
        colors[color]
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          iconBg[color]
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ── QR Scanner Component ────────────────────────────────────────

function QrScanner({
  onScan,
  mode,
}: {
  onScan: (text: string) => void;
  mode: ScanMode;
}) {
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  // Keep the callback ref up to date without restarting the scanner
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let mounted = true;
    let html5QrCode: any = null;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!mounted || !scannerContainerRef.current) return;

        const scannerId = `qr-reader-${Date.now()}`;
        const div = document.createElement("div");
        div.id = scannerId;
        scannerContainerRef.current.innerHTML = "";
        scannerContainerRef.current.appendChild(div);

        html5QrCode = new Html5Qrcode(scannerId);

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            // Stop scanner immediately, then call the callback
            if (html5QrCode) {
              const scanner = html5QrCode;
              html5QrCode = null; // prevent double-stop
              scanner
                .stop()
                .then(() => {
                  if (mounted) onScanRef.current(decodedText);
                })
                .catch(() => {
                  if (mounted) onScanRef.current(decodedText);
                });
            }
          },
          () => {
            // QR code not found in this frame — ignore
          }
        );

        if (mounted) setStarted(true);
      } catch (err) {
        if (mounted) {
          console.error("Scanner error:", err);
          setError(
            "לא ניתן לגשת למצלמה. ודא שנתת הרשאה לשימוש במצלמה."
          );
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
        html5QrCode = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount — callback is accessed via ref

  const modeColor = {
    "key-checkin": "border-green-400",
    "key-checkout": "border-red-400",
    guest: "border-blue-400",
  };

  const modeLabel = {
    "key-checkin": "סרוק QR מפתח — כניסה",
    "key-checkout": "סרוק QR מפתח — עזיבה",
    guest: "סרוק QR תיק אורח",
  };

  const modeIcon = {
    "key-checkin": <KeyRound className="w-4 h-4" />,
    "key-checkout": <KeyRound className="w-4 h-4" />,
    guest: <User className="w-4 h-4" />,
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Mode indicator */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 mb-4 text-sm font-medium",
          modeColor[mode],
          mode === "key-checkin" && "bg-green-50 text-green-700",
          mode === "key-checkout" && "bg-red-50 text-red-700",
          mode === "guest" && "bg-blue-50 text-blue-700"
        )}
      >
        {modeIcon[mode]}
        {modeLabel[mode]}
      </div>

      {/* Scanner area */}
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden border-2 bg-black",
          modeColor[mode]
        )}
      >
        <div ref={scannerContainerRef} className="w-full" />

        {/* Not started yet */}
        {!started && !error && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">טוען מצלמה...</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
          {error}
        </div>
      )}

      {/* Instructions */}
      <p className="text-center text-xs text-gray-400 mt-3">
        כוון את המצלמה אל קוד ה-QR
      </p>
    </div>
  );
}
