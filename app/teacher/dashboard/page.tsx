"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { formatDateRange } from "@/lib/utils/format";
import type { Booking, BookingWithParent, Teacher } from "@/types";

// ---------------------------------------------------------------------------
// Shared Navbar
// ---------------------------------------------------------------------------

function TeacherNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Dashboard", href: "/teacher/dashboard" },
    { label: "Booking Requests", href: "/teacher/requests" },
    { label: "My Profile", href: "/teacher/setup" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 z-50 flex items-center">
      <div className="max-w-5xl mx-auto px-4 md:px-6 w-full flex items-center justify-between">
        <Link
          href="/teacher/dashboard"
          className="font-serif italic font-bold text-xl text-primary"
        >
          TeachSitter
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-primary font-bold border-b-2 border-primary pb-0.5 text-sm"
                    : "text-on-surface-variant hover:text-primary text-sm transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <div className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm select-none">
            T
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Shared Mobile Bottom Nav
// ---------------------------------------------------------------------------

function MobileBottomNav() {
  const pathname = usePathname();

  const items = [
    { label: "Dashboard", icon: "dashboard", href: "/teacher/dashboard" },
    { label: "Requests", icon: "pending_actions", href: "/teacher/requests" },
    { label: "Profile", icon: "person", href: "/teacher/setup" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/20 z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 ${
                isActive ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TeacherDashboardPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [confirmed, setConfirmed] = useState<Booking[]>([]);
  const [pending, setPending] = useState<BookingWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/teachers/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/teachers/me/bookings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([meData, bookingsData]) => {
        if (meData?.teacher) {
          setTeacherName((meData.teacher as Teacher).full_name ?? "Teacher");
        }
        if (bookingsData) {
          setConfirmed((bookingsData as { confirmed: Booking[] }).confirmed ?? []);
          setPending((bookingsData as { pending: BookingWithParent[] }).pending ?? []);
        } else {
          setError("Unable to load bookings.");
        }
      })
      .catch(() => {
        setError("Unable to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateStatus(bookingId: string, newStatus: "confirmed" | "declined") {
    // Snapshot for rollback
    const prevPending = pending;
    const prevConfirmed = confirmed;

    // Optimistic update
    const booking = pending.find((b) => b.id === bookingId);
    if (!booking) return;

    setPending((prev) => prev.filter((b) => b.id !== bookingId));
    if (newStatus === "confirmed") {
      setConfirmed((prev) => [...prev, booking]);
    }

    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        setPending(prevPending);
        setConfirmed(prevConfirmed);
        setError("Failed to update booking. Please try again.");
      }
    } catch {
      setPending(prevPending);
      setConfirmed(prevConfirmed);
      setError("Failed to update booking. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <TeacherNavbar />
      <MobileBottomNav />

      <main className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Page header */}
          <h1 className="text-3xl font-bold text-on-surface">Good morning, {teacherName}!</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span>
            </span>
            <span className="text-sm text-on-surface-variant">Available for bookings</span>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-error-container/20 border border-error/20 rounded-xl px-4 py-3 mt-4">
              <span className="material-symbols-outlined text-error text-[18px]">
                error_outline
              </span>
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="mt-12 flex justify-center">
              <span className="material-symbols-outlined text-4xl text-outline animate-spin">
                progress_activity
              </span>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8 mt-6">
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    event_available
                  </span>
                  <p className="text-4xl font-bold text-on-surface mt-2">{confirmed.length}</p>
                  <p className="text-sm text-on-surface-variant font-medium">Upcoming Sessions</p>
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
                  <span className="material-symbols-outlined text-2xl text-secondary">
                    pending_actions
                  </span>
                  <p className="text-4xl font-bold text-on-surface mt-2">{pending.length}</p>
                  <p className="text-sm text-on-surface-variant font-medium">Pending Requests</p>
                </div>
              </div>

              {/* Main grid */}
              <div className="grid lg:grid-cols-12 gap-8">
                {/* Left — Upcoming Sessions */}
                <div className="lg:col-span-8">
                  <h2 className="text-xl font-bold text-on-surface mb-4">Upcoming Sessions</h2>

                  <div className="flex flex-col gap-3">
                    {confirmed.map((session) => {
                      const initials = session.parent_id.slice(0, 2).toUpperCase();
                      return (
                        <div
                          key={session.id}
                          className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex gap-4"
                        >
                          <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-on-surface">
                                Confirmed Session
                              </span>
                              <span className="bg-tertiary-fixed text-on-tertiary-container text-xs font-bold px-2.5 py-0.5 rounded-full">
                                Confirmed
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-sm text-on-surface-variant leading-none">
                                calendar_month
                              </span>
                              <span className="text-sm text-on-surface-variant">
                                {formatDateRange(session.start_date, session.end_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {confirmed.length === 0 && (
                      <p className="text-sm text-on-surface-variant text-center py-8">
                        No upcoming sessions.
                      </p>
                    )}
                  </div>

                  {/* Policy reminder */}
                  <div className="mt-6 bg-primary-fixed/40 rounded-2xl p-4 border border-primary-fixed flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">
                      lightbulb
                    </span>
                    <p className="text-sm text-on-surface-variant">
                      Reminder: Confirm or decline requests within 48 hours so parents can plan
                      ahead.
                    </p>
                  </div>
                </div>

                {/* Right — Pending Requests */}
                <div className="lg:col-span-4">
                  <div className="sticky top-24">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-secondary text-xl">
                        pending_actions
                      </span>
                      <h2 className="text-base font-bold text-on-surface">Pending Requests</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                      {pending.map((request) => {
                        const initials = request.parent_display_name
                          .split(" ")
                          .map((w) => w.charAt(0))
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <div
                            key={request.id}
                            className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-secondary-fixed rounded-full text-secondary font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {initials}
                              </div>
                              <span className="text-sm font-bold text-on-surface">
                                {request.parent_display_name}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1">
                              {formatDateRange(request.start_date, request.end_date)}
                            </p>
                            {request.message && (
                              <p className="italic text-xs text-on-surface-variant mt-1 line-clamp-2">
                                &quot;{request.message}&quot;
                              </p>
                            )}

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleUpdateStatus(request.id, "confirmed")}
                                disabled={updatingId === request.id}
                                className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl py-2 text-xs font-bold text-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(request.id, "declined")}
                                disabled={updatingId === request.id}
                                className="flex-1 border border-outline-variant/30 text-on-surface-variant rounded-xl py-2 text-xs font-bold text-center hover:bg-surface-container transition-all disabled:opacity-60"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {pending.length === 0 && (
                        <p className="text-sm text-on-surface-variant text-center py-4">
                          No pending requests.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
