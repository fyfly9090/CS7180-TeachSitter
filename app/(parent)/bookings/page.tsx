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
  status: "pending" | "confirmed" | "declined";
  message: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)}–${fmt(end)}`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
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

// ── Booking Card (Confirmed / Pending) ─────────────────────────────────────────

function BookingCard({ booking }: { booking: BookingItem }) {
  const isConfirmed = booking.status === "confirmed";
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
          {initials(booking.teacher_name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold text-on-surface">
              {booking.teacher_name ?? "Unknown teacher"}
            </p>
            {isConfirmed ? (
              <span className="bg-tertiary-fixed text-on-tertiary-container text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Confirmed
              </span>
            ) : (
              <span className="bg-secondary-fixed text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
              calendar_today
            </span>
            <span className="text-sm text-on-surface-variant">
              {formatDateRange(booking.start_date, booking.end_date)}
            </span>
          </div>
          {booking.teacher_classroom && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                school
              </span>
              <span className="text-sm text-on-surface-variant">{booking.teacher_classroom}</span>
            </div>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button className="border border-outline-variant/30 text-primary rounded-xl px-4 py-2 text-xs font-bold hover:bg-primary-fixed/20 transition-all">
              Message
            </button>
            {isConfirmed ? (
              <button className="border border-outline-variant/30 text-primary rounded-xl px-4 py-2 text-xs font-bold hover:bg-primary-fixed/20 transition-all">
                Modify
              </button>
            ) : (
              <button className="border border-outline-variant/30 text-on-surface-variant rounded-xl px-4 py-2 text-xs font-bold hover:bg-surface-container transition-all">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const confirmed = bookings.filter((b) => b.status === "confirmed" && !isInPast(b.end_date));
  const pending = bookings.filter((b) => b.status === "pending");
  const past = bookings.filter((b) => b.status === "confirmed" && isInPast(b.end_date));

  return (
    <>
      <Navbar />
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Page header */}
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
            /* Main grid */
            <div className="lg:grid lg:grid-cols-3 lg:gap-8 mt-8">
              {/* Main column */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Confirmed section */}
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
                        <BookingCard key={b.id} booking={b} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests section */}
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
                        <BookingCard key={b.id} booking={b} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Past Sessions section */}
                <div>
                  <h2 className="text-base font-bold text-on-surface-variant mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">history</span>
                    Past Sessions
                  </h2>
                  {past.length === 0 ? (
                    <p className="text-sm text-on-surface-variant py-3">No past sessions.</p>
                  ) : (
                    <div className="flex flex-col">
                      {past.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between border-b border-outline-variant/20 py-3 gap-2 flex-wrap"
                        >
                          <div className="flex items-center gap-2 flex-wrap text-sm text-on-surface-variant">
                            <span>{formatDateRange(session.start_date, session.end_date)}</span>
                            <span className="text-outline">·</span>
                            <span className="font-medium text-on-surface">
                              {session.teacher_name ?? "Unknown teacher"}
                            </span>
                          </div>
                          <span className="bg-tertiary-fixed text-on-tertiary-container text-xs px-2 py-0.5 rounded-full font-medium">
                            Completed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar: Summary */}
              <div className="lg:col-span-1 mt-8 lg:mt-0">
                <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
                  <h2 className="text-base font-bold text-on-surface mb-4">Summary</h2>
                  <div className="flex flex-col gap-3">
                    <div className="bg-surface-container-low rounded-xl p-3 text-center">
                      <p
                        className="text-2xl font-bold text-primary"
                        data-testid="sidebar-upcoming-count"
                      >
                        {confirmed.length}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Upcoming</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-3 text-center">
                      <p
                        className="text-2xl font-bold text-secondary"
                        data-testid="sidebar-pending-count"
                      >
                        {pending.length}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Pending</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-3 text-center">
                      <p
                        className="text-2xl font-bold text-on-surface-variant"
                        data-testid="sidebar-completed-count"
                      >
                        {past.length}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Completed</p>
                    </div>
                  </div>
                  <button className="w-full mt-4 border border-outline-variant/30 text-on-surface-variant rounded-xl py-2.5 text-sm font-semibold hover:bg-surface-container transition-all">
                    Download Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
