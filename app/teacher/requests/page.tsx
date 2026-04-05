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
  const [selectedBooking, setSelectedBooking] = useState<BookingWithParent | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

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
      setConfirmed((prev) => [...prev, { ...booking, status: "confirmed" }]);
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

  async function handleCancelBooking(bookingId: string) {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "declined",
          cancel_reason: cancelReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError("Failed to cancel booking. Please try again.");
        return;
      }
      setConfirmed((prev) => prev.filter((b) => b.id !== bookingId));
      setSelectedBooking(null);
      setShowCancelForm(false);
      setCancelReason("");
    } catch {
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  function closeModal() {
    setSelectedBooking(null);
    setShowCancelForm(false);
    setCancelReason("");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
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
                  {confirmed.map((session) => (
                    <div
                      key={session.id}
                      className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        {getInitials(session.parent_display_name)}
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
                      <button
                        onClick={() => setSelectedBooking(session)}
                        className="bg-surface-container-high px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  ))}

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
                    {pending.map((request) => (
                      <div
                        key={request.id}
                        className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-secondary-fixed rounded-full text-secondary font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {getInitials(request.parent_display_name)}
                            </div>
                            <span className="text-sm font-bold text-on-surface">
                              {request.parent_display_name}
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedBooking(request)}
                            className="text-xs text-primary font-semibold hover:underline"
                          >
                            View
                          </button>
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
                    ))}

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

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={closeModal}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-lg">
                  {getInitials(selectedBooking.parent_display_name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">
                    {selectedBooking.parent_display_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant">{selectedBooking.parent_email}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Status badge */}
            <div className="mb-4">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  selectedBooking.status === "confirmed"
                    ? "bg-tertiary-fixed text-on-tertiary-container"
                    : selectedBooking.status === "pending"
                      ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                      : "bg-error-container text-error"
                }`}
              >
                {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Dates */}
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  calendar_month
                </span>
                <div>
                  <p className="text-xs text-on-surface-variant">Dates</p>
                  <p className="text-sm font-semibold text-on-surface">
                    {formatDateRange(selectedBooking.start_date, selectedBooking.end_date)}
                  </p>
                </div>
              </div>

              {/* Message */}
              {selectedBooking.message && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                    chat
                  </span>
                  <div>
                    <p className="text-xs text-on-surface-variant">Message from Parent</p>
                    <p className="text-sm text-on-surface italic">
                      &quot;{selectedBooking.message}&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* Children */}
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                  child_care
                </span>
                <div>
                  <p className="text-xs text-on-surface-variant">Children</p>
                  {selectedBooking.children && selectedBooking.children.length > 0 ? (
                    <div className="flex flex-col gap-1 mt-1">
                      {selectedBooking.children.map((child, i) => (
                        <p key={i} className="text-sm text-on-surface">
                          {child.classroom} classroom &middot; Age {child.age}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant">No children info available</p>
                  )}
                </div>
              </div>

              {/* Booked on */}
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                <div>
                  <p className="text-xs text-on-surface-variant">Requested On</p>
                  <p className="text-sm text-on-surface">
                    {new Date(selectedBooking.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Cancel form */}
            {showCancelForm && selectedBooking.status === "confirmed" && (
              <div className="mt-6 pt-4 border-t border-outline-variant/20">
                <p className="text-sm font-semibold text-error mb-2">Cancel this booking?</p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Optional: Let the parent know why you're cancelling..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-sm text-on-surface placeholder:text-outline resize-none"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    disabled={cancelling}
                    className="flex-1 bg-error text-on-error rounded-xl py-2.5 text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                    }}
                    className="px-4 border border-outline-variant/30 text-on-surface-variant rounded-xl py-2.5 text-sm font-bold hover:bg-surface-container transition-all"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              className={`mt-6 pt-4 border-t border-outline-variant/20 flex gap-3 ${showCancelForm ? "hidden" : ""}`}
            >
              {selectedBooking.status === "pending" && (
                <>
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedBooking.id, "confirmed");
                      closeModal();
                    }}
                    className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl py-2.5 text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedBooking.id, "declined");
                      closeModal();
                    }}
                    className="flex-1 border border-outline-variant/30 text-on-surface-variant rounded-xl py-2.5 text-sm font-bold hover:bg-surface-container transition-all"
                  >
                    Decline
                  </button>
                </>
              )}
              {selectedBooking.status === "confirmed" && !showCancelForm && (
                <button
                  onClick={() => setShowCancelForm(true)}
                  className="flex-1 bg-error text-on-error rounded-xl py-2.5 text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Cancel Booking
                </button>
              )}
              <button
                onClick={closeModal}
                className="px-6 border border-outline-variant/30 text-on-surface-variant rounded-xl py-2.5 text-sm font-bold hover:bg-surface-container transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
