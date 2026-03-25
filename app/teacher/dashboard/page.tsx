"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingRequest {
  id: number;
  parentName: string;
  initials: string;
  dateRange: string;
  message: string;
  status: "pending" | "accepted" | "declined";
}

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
        {/* Logo */}
        <Link
          href="/teacher/dashboard"
          className="font-serif italic font-bold text-xl text-primary"
        >
          TeachSitter
        </Link>

        {/* Desktop nav */}
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

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              notifications
            </span>
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
              <span className="material-symbols-outlined text-2xl">
                {item.icon}
              </span>
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
// Static data
// ---------------------------------------------------------------------------

const upcomingSessions = [
  {
    id: 1,
    childName: "Lily Johnson",
    initials: "LJ",
    classroom: "Sunflower",
    dateRange: "Jun 16 – Jun 20, 2026",
    time: "8:00 AM – 5:00 PM",
  },
  {
    id: 2,
    childName: "Oliver Chen",
    initials: "OC",
    classroom: "Butterfly",
    dateRange: "Jun 23 – Jun 27, 2026",
    time: "9:00 AM – 3:00 PM",
  },
  {
    id: 3,
    childName: "Mia Park",
    initials: "MP",
    classroom: "Rainbow",
    dateRange: "Jul 7 – Jul 11, 2026",
    time: "8:00 AM – 4:00 PM",
  },
];

const initialPendingRequests: BookingRequest[] = [
  {
    id: 1,
    parentName: "Patricia Johnson",
    initials: "PJ",
    dateRange: "Jun 16 – Jun 20, 2026",
    message: "Hi Ms. Tara, Lily would love to spend the break with you!",
    status: "pending",
  },
  {
    id: 2,
    parentName: "Mark Chen",
    initials: "MC",
    dateRange: "Jun 23 – Jun 27, 2026",
    message: "Mr. Chen here — Oliver is very excited!",
    status: "pending",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TeacherDashboardPage() {
  const [requests, setRequests] =
    useState<BookingRequest[]>(initialPendingRequests);

  function handleAccept(id: number) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "accepted" } : r))
    );
  }

  function handleDecline(id: number) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined" } : r))
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <>
      <TeacherNavbar />
      <MobileBottomNav />

      <main className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Page header */}
          <h1 className="text-3xl font-bold text-on-surface">
            Good morning, Ms. Tara!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span>
            </span>
            <span className="text-sm text-on-surface-variant">
              Available for bookings
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 mt-6">
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
              <span className="material-symbols-outlined text-2xl text-primary">
                event_available
              </span>
              <p className="text-4xl font-bold text-on-surface mt-2">3</p>
              <p className="text-sm text-on-surface-variant font-medium">
                Upcoming Sessions
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
              <span className="material-symbols-outlined text-2xl text-secondary">
                pending_actions
              </span>
              <p className="text-4xl font-bold text-on-surface mt-2">2</p>
              <p className="text-sm text-on-surface-variant font-medium">
                Pending Requests
              </p>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left — Upcoming Sessions */}
            <div className="lg:col-span-8">
              <h2 className="text-xl font-bold text-on-surface mb-4">
                Upcoming Sessions
              </h2>

              <div className="flex flex-col gap-3">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex gap-4"
                  >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                      {session.initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-on-surface">
                          {session.childName}
                        </span>
                        <span className="bg-tertiary-fixed text-on-tertiary-container text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {session.classroom}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant leading-none">
                          calendar_month
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          {session.dateRange}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant leading-none">
                          schedule
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          {session.time}
                        </span>
                      </div>
                      <button className="text-xs text-primary font-semibold mt-1 hover:underline">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Policy reminder */}
              <div className="mt-6 bg-primary-fixed/40 rounded-2xl p-4 border border-primary-fixed flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">
                  lightbulb
                </span>
                <p className="text-sm text-on-surface-variant">
                  Reminder: Confirm or decline requests within 48 hours so
                  parents can plan ahead.
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
                  <h2 className="text-base font-bold text-on-surface">
                    Pending Requests
                  </h2>
                </div>

                <div className="flex flex-col gap-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 shadow-sm"
                    >
                      {/* Parent info */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-secondary-fixed rounded-full text-secondary font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {request.initials}
                        </div>
                        <span className="text-sm font-bold text-on-surface">
                          {request.parentName}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {request.dateRange}
                      </p>
                      <p className="italic text-xs text-on-surface-variant mt-1 line-clamp-2">
                        "{request.message}"
                      </p>

                      {/* Action buttons or status */}
                      {request.status === "pending" ? (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAccept(request.id)}
                            className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl py-2 text-xs font-bold text-center hover:opacity-90 active:scale-95 transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(request.id)}
                            className="flex-1 border border-outline-variant/30 text-on-surface-variant rounded-xl py-2 text-xs font-bold text-center hover:bg-surface-container transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`mt-3 text-center text-xs font-bold py-2 rounded-xl ${
                            request.status === "accepted"
                              ? "bg-tertiary-fixed text-on-tertiary-container"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {request.status === "accepted"
                            ? "Accepted"
                            : "Declined"}
                        </div>
                      )}
                    </div>
                  ))}

                  {pendingRequests.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-4">
                      No pending requests.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
