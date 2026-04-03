"use client";

import { useState, useEffect } from "react";
import { formatDateRange } from "@/lib/utils/format";
import type { BookingWithParent } from "@/types";

export default function TeacherRequestsPage() {
  const [confirmed, setConfirmed] = useState<BookingWithParent[]>([]);
  const [pending, setPending] = useState<BookingWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teachers/me/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((bookingsData) => {
        if (bookingsData) {
          setConfirmed((bookingsData as { confirmed: BookingWithParent[] }).confirmed ?? []);
          setPending((bookingsData as { pending: BookingWithParent[] }).pending ?? []);
        } else {
          setError("Unable to load bookings.");
        }
      })
      .catch(() => {
        setError("Unable to load booking requests.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateStatus(bookingId: string, newStatus: "confirmed" | "declined") {
    const prevPending = pending;
    const prevConfirmed = confirmed;

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
    <main className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Page header */}
        <h1 className="text-3xl font-bold text-on-surface">Booking Requests</h1>
        <p className="text-on-surface-variant mt-1">
          Review and manage your incoming booking requests.
        </p>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-error-container/20 border border-error/20 rounded-xl px-4 py-3 mt-4">
            <span className="material-symbols-outlined text-error text-[18px]">error_outline</span>
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
                <p className="text-sm text-on-surface-variant font-medium">Confirmed Bookings</p>
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
              {/* Left — Upcoming Bookings */}
              <div className="lg:col-span-8">
                <h2 className="text-xl font-bold text-on-surface mb-4">Upcoming Bookings</h2>

                <div className="flex flex-col gap-3">
                  {confirmed.map((session) => {
                    const initials = session.parent_display_name
                      .split(" ")
                      .map((w) => w.charAt(0))
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <div
                        key={session.id}
                        className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-on-surface">
                              {session.parent_display_name}
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
                        <button className="bg-surface-container-high px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                          Details
                        </button>
                      </div>
                    );
                  })}

                  {confirmed.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-8">
                      No upcoming bookings.
                    </p>
                  )}
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
                    {pending.length > 0 && (
                      <span className="bg-secondary text-on-secondary text-xs px-2 py-0.5 rounded-full font-bold">
                        {pending.length}
                      </span>
                    )}
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
  );
}
