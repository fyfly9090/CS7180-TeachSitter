"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";

function getInitials(name: string): string {
  const words = name.split(/[\s.@]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  return `${MONTHS[m - 1]} ${day}`;
}

function formatTime(t: string): string {
  const [h, min] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, "0")} ${period}`;
}

interface AvailabilitySlot {
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
}

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
          <button
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <div className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm select-none">
            P
          </div>
        </div>
      </div>
    </header>
  );
}

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

function InvalidLink() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-5xl text-error mb-4">link_off</span>
      <p className="text-on-surface font-semibold text-lg">Invalid booking link.</p>
      <p className="text-on-surface-variant text-sm mt-1">
        Please go back and select a teacher from the search page.
      </p>
      <Link
        href="/search"
        className="mt-6 bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all"
      >
        Back to Search
      </Link>
    </div>
  );
}

function NewBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const teacherId = searchParams.get("teacher_id");
  const teacherName = searchParams.get("teacher_name") ?? "";
  const classroom = searchParams.get("classroom") ?? "";
  const initialStartDate = searchParams.get("start_date") ?? "";
  const initialEndDate = searchParams.get("end_date") ?? "";

  const availabilityParam = searchParams.get("availability");
  let availability: AvailabilitySlot[] = [];
  if (availabilityParam) {
    try {
      availability = JSON.parse(availabilityParam) as AvailabilitySlot[];
    } catch {
      // ignore malformed param
    }
  }

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!teacherId) {
    return (
      <>
        <Navbar />
        <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
          <div className="max-w-5xl mx-auto px-4 md:px-6 pt-8">
            <InvalidLink />
          </div>
        </div>
        <MobileBottomNav />
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        teacher_id: teacherId,
        start_date: startDate,
        end_date: endDate,
      };
      if (message.trim()) body.message = message.trim();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/bookings");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-8 pb-6">
          {/* Back link */}
          <Link
            href="/search"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Search
          </Link>

          <h1 className="font-headline text-3xl md:text-4xl text-primary font-bold tracking-tight">
            Request a Booking
          </h1>
          <p className="text-on-surface-variant mt-1 mb-8">
            Review the details and send your request to the teacher.
          </p>

          {/* Teacher summary card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                {teacherName ? getInitials(teacherName) : "?"}
              </div>
              <div>
                <p className="text-base font-bold text-on-surface">{teacherName || "Teacher"}</p>
                {classroom && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                      school
                    </span>
                    <span className="text-sm text-on-surface-variant">{classroom} Class</span>
                  </div>
                )}
              </div>
            </div>
            {availability.length > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant/15">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Available
                </p>
                <div className="flex flex-col gap-1">
                  {availability.map((slot, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        event_available
                      </span>
                      <span>
                        {formatDate(slot.start_date)}
                        {" – "}
                        {formatDate(slot.end_date)}
                        {slot.start_time && slot.end_time && (
                          <span className="text-on-surface-variant/70">
                            {" · "}
                            {formatTime(slot.start_time)}
                            {" – "}
                            {formatTime(slot.end_time)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Date range */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <label
                  htmlFor="start-date"
                  className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1"
                >
                  Start Date
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                    calendar_today
                  </span>
                  <input
                    id="start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label
                  htmlFor="end-date"
                  className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1"
                >
                  End Date
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                    calendar_today
                  </span>
                  <input
                    id="end-date"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="message"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1"
              >
                Message <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! My child is in your class and would love to spend break time with you…"
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-on-surface resize-none"
              />
              <p className="text-xs text-on-surface-variant text-right mr-1">
                {message.length}/500
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-error-container/20 border border-error/20 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-error text-[18px]">
                  error_outline
                </span>
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {submitting ? "Sending Request…" : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense>
      <NewBookingContent />
    </Suspense>
  );
}
