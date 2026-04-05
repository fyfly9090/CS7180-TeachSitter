"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookingItem {
  id: string;
  teacher_id: string;
  teacher_name: string | null;
  teacher_classroom: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: "pending" | "confirmed" | "declined";
  message: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Deterministic photo index from teacher UUID (1–3). */
function teacherPhotoSrc(teacherId: string): string {
  const hex = teacherId.replace(/-/g, "").slice(0, 8);
  const num = parseInt(hex, 16);
  return `/teachers/teacher-${(num % 3) + 1}.png`;
}

/** "2026-06-16" → "Jun 16" */
function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "2026-06-16" → "JUNE 16" */
function fmtDateHeader(d: string): string {
  return new Date(d + "T00:00:00")
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
}

/** "08:00:00" → "08:00 AM" */
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Returns total hours, defaulting to 8h/day when no time data. */
function fmtDuration(
  startDate: string,
  endDate: string,
  startTime: string | null,
  endTime: string | null
): string {
  const days =
    Math.round(
      (new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) /
        86400000
    ) + 1;
  const [sh, sm] = startTime ? startTime.split(":").map(Number) : [8, 0];
  const [eh, em] = endTime ? endTime.split(":").map(Number) : [16, 0]; // default 8h day
  const totalHours = Math.round(days * ((eh * 60 + em - sh * 60 - sm) / 60));
  return `${totalHours} hour${totalHours !== 1 ? "s" : ""}`;
}

function isInPast(endDate: string): boolean {
  return endDate < new Date().toISOString().slice(0, 10);
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  const pathname = usePathname();
  const navLinks = [
    { label: "Find Teachers", href: "/search" },
    { label: "My Bookings", href: "/bookings" },
    { label: "Profile", href: "/profile" },
  ];
  return (
    <header className="fixed top-0 inset-x-0 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 z-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
        <Link href="/dashboard" className="font-serif italic font-bold text-xl text-primary">
          TeachSitter
        </Link>
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-primary font-bold"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm select-none hover:opacity-80 transition-opacity"
            aria-label="Go to dashboard"
          >
            P
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── MobileBottomNav ────────────────────────────────────────────────────────────

function MobileBottomNav() {
  const pathname = usePathname();
  const items = [
    { label: "Search", icon: "search", href: "/search" },
    { label: "Bookings", icon: "bookmark_added", href: "/bookings" },
    { label: "Profile", icon: "person", href: "/profile" },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/20 z-50">
      <div className="flex justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-6 transition-all ${
                isActive ? "text-primary scale-110" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── BookingModifyModal ─────────────────────────────────────────────────────────

function BookingModifyModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: BookingItem;
  onClose: () => void;
  onSuccess: (
    bookingId: string,
    startDate: string,
    endDate: string,
    message: string | null
  ) => void;
}) {
  const [startDate, setStartDate] = useState(booking.start_date);
  const [endDate, setEndDate] = useState(booking.end_date);
  const [message, setMessage] = useState(booking.message ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        setError(data.error?.message ?? "Failed to update booking. Please try again.");
        return;
      }
      onSuccess(booking.id, startDate, endDate, message.trim() || null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modify-modal-title"
        className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="modify-modal-title" className="text-lg font-bold text-on-surface">
            Modify Booking
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              close
            </span>
          </button>
        </div>

        {/* Teacher summary */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-outline-variant/20">
          <img
            src={teacherPhotoSrc(booking.teacher_id)}
            alt={booking.teacher_name ?? "Teacher"}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
          <div>
            <p className="text-sm font-bold text-on-surface">
              {booking.teacher_name ?? "Unknown teacher"}
            </p>
            {booking.teacher_classroom && (
              <p className="text-xs text-on-surface-variant mt-0.5 uppercase tracking-widest">
                {booking.teacher_classroom} Class
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Date range */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="modify-start-date"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
              >
                Start Date
              </label>
              <input
                id="modify-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-on-surface"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="modify-end-date"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
              >
                End Date
              </label>
              <input
                id="modify-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-on-surface"
              />
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modify-message"
              className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Message <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              id="modify-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-on-surface resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-error bg-error-container/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Updating…" : "Update Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── BookingCard ────────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onModify,
  onCancel,
}: {
  booking: BookingItem;
  onModify: () => void;
  onCancel: () => void;
}) {
  const isConfirmed = booking.status === "confirmed";
  const startFmt = fmtTime(booking.start_time);
  const endFmt = fmtTime(booking.end_time);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
      <div className="flex gap-4 items-start">
        {/* Teacher photo */}
        <img
          src={teacherPhotoSrc(booking.teacher_id)}
          alt={booking.teacher_name ?? "Teacher"}
          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
        />

        {/* Center: name + classroom + buttons */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-primary">
            {booking.teacher_name ?? "Unknown teacher"}
          </p>
          {booking.teacher_classroom && (
            <p className="text-xs text-on-surface-variant mt-0.5 uppercase tracking-widest">
              {booking.teacher_classroom} Class
            </p>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button className="bg-primary text-on-primary rounded-full px-5 py-1.5 text-xs font-bold hover:bg-primary/90 transition-all">
              Message
            </button>
            <button
              onClick={isConfirmed ? onModify : onCancel}
              className="border border-outline-variant/40 text-on-surface rounded-full px-5 py-1.5 text-xs font-semibold hover:bg-surface-container transition-all"
            >
              {isConfirmed ? "Modify Booking" : "Cancel"}
            </button>
          </div>
        </div>

        {/* Right: date + time */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-on-surface">
            {fmtDate(booking.start_date)} - {fmtDate(booking.end_date)}
          </p>
          {startFmt && endFmt && (
            <p className="text-xs text-on-surface-variant mt-1">
              {startFmt} - {endFmt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PastHistorySidebar ─────────────────────────────────────────────────────────

function PastHistorySidebar({ past }: { past: BookingItem[] }) {
  return (
    <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-on-surface">Past History</h2>
        <button className="text-primary text-xs font-medium hover:underline">
          download Report
        </button>
      </div>

      {past.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-2">No past sessions yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-outline-variant/20">
          {past.map((session) => (
            <div key={session.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">
                {fmtDateHeader(session.start_date)}
              </p>
              <p className="text-sm font-bold text-on-surface">
                {session.teacher_name ?? "Unknown teacher"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Completed •{" "}
                {fmtDuration(
                  session.start_date,
                  session.end_date,
                  session.start_time,
                  session.end_time
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      <button className="w-full mt-5 border border-outline-variant/30 text-on-surface-variant rounded-2xl py-2.5 text-sm font-semibold hover:bg-surface-container transition-all flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[16px]">history</span>
        Download History Report
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifyTarget, setModifyTarget] = useState<BookingItem | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: { bookings: BookingItem[] }) => setBookings(data.bookings))
      .catch(() => setError("Failed to load bookings. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(bookingId: string) {
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    if (res.ok) {
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    }
  }

  function handleModifySuccess(
    bookingId: string,
    newStartDate: string,
    newEndDate: string,
    newMessage: string | null
  ) {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              start_date: newStartDate,
              end_date: newEndDate,
              status: "pending",
              message: newMessage,
            }
          : b
      )
    );
    setModifyTarget(null);
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed" && !isInPast(b.end_date));
  const pending = bookings.filter((b) => b.status === "pending");
  const past = bookings.filter((b) => b.status === "confirmed" && isInPast(b.end_date));

  return (
    <>
      <Navbar />
      {modifyTarget && (
        <BookingModifyModal
          booking={modifyTarget}
          onClose={() => setModifyTarget(null)}
          onSuccess={handleModifySuccess}
        />
      )}
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <h1 className="text-3xl font-bold text-on-surface">My Bookings</h1>
          <p className="text-on-surface-variant mt-1">
            Track your childcare requests and confirmed sessions.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl bg-error-container text-on-error-container px-5 py-4 text-sm font-medium">
              {error}
            </div>
          )}

          {loading && !error && (
            <div className="mt-12 flex justify-center text-on-surface-variant text-sm">
              Loading bookings…
            </div>
          )}

          {!loading && !error && (
            <div className="lg:grid lg:grid-cols-3 lg:gap-8 mt-8">
              {/* Left: Confirmed + Pending */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Confirmed */}
                <div>
                  <h2 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-tertiary text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    Confirmed
                  </h2>
                  {confirmed.length === 0 ? (
                    <p className="text-sm text-on-surface-variant py-3">
                      No confirmed bookings yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {confirmed.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          onModify={() => setModifyTarget(b)}
                          onCancel={() => handleCancel(b.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests */}
                <div>
                  <h2 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      schedule
                    </span>
                    Pending Requests
                  </h2>
                  {pending.length === 0 ? (
                    <p className="text-sm text-on-surface-variant py-3">No pending requests.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {pending.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          onModify={() => setModifyTarget(b)}
                          onCancel={() => handleCancel(b.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Past History */}
              <div className="lg:col-span-1 mt-8 lg:mt-0">
                <PastHistorySidebar past={past} />
              </div>
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
