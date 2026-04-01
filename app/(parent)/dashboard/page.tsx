"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChildData {
  id: string;
  name: string;
  classroom: string;
  age: number;
  notes?: string;
}

interface BookingData {
  id: string;
  teacher_name: string | null;
  teacher_classroom: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  status: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatAge(age: number): string {
  return age === 1 ? "1 Year Old" : `${age} Years Old`;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
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

// ── AddChildModal ──────────────────────────────────────────────────────────────

interface AddChildModalProps {
  onClose: () => void;
  onAdd: (child: ChildData) => void;
}

function AddChildModal({ onClose, onAdd }: AddChildModalProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [classroom, setClassroom] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !classroom.trim() || !age) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          classroom: classroom.trim(),
          age: Number(age),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Failed to add child");
        return;
      }
      onAdd(data.child);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a Child"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl border border-outline-variant/20">
        <h2 className="text-lg font-bold text-on-surface mb-5">Add a Child</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="child-name"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Name
            </label>
            <input
              id="child-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Child's name"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="child-age"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Age
            </label>
            <input
              id="child-age"
              type="number"
              min={1}
              max={10}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age (1–10)"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="child-classroom"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Classroom
            </label>
            <input
              id="child-classroom"
              type="text"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="e.g. Sunflower"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="child-notes"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Notes
            </label>
            <textarea
              id="child-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, nap schedule, special needs…"
              rows={3}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-error mt-3">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-outline-variant/40 text-on-surface-variant px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Child"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI sidebar data (static placeholder) ──────────────────────────────────────

const aiSuggestions = [
  {
    initials: "TS",
    name: "Ms. Tara Smith",
    rank: "#1 Match",
    reasoning: "Same classroom as Lily — highest familiarity.",
  },
  {
    initials: "RC",
    name: "Ms. Rachel Chen",
    rank: "#2 Match",
    reasoning: "Strong availability overlap with your requested dates.",
  },
];

// ── DashboardPage ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [classroom, setClassroom] = useState("All Classrooms");
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);

  useEffect(() => {
    fetch("/api/children")
      .then((r) => r.json())
      .then((data) => {
        if (data.children) setChildren(data.children);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => {
        if (data.bookings) setBookings(data.bookings);
      })
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("start_date", dateFrom);
    if (dateTo) params.set("end_date", dateTo);
    if (classroom !== "All Classrooms") params.set("classroom", encodeURIComponent(classroom));
    router.push(`/search?${params.toString()}`);
  };

  const handleDeleteChild = async (id: string) => {
    const res = await fetch(`/api/children/${id}`, { method: "DELETE" });
    if (res.ok) {
      setChildren((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleChildAdded = (child: ChildData) => {
    setChildren((prev) => [...prev, child]);
  };

  return (
    <>
      <Navbar />
      <div className="bg-background min-h-screen pt-16 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Page header */}
              <div>
                <h1 className="text-3xl font-bold text-on-surface">Welcome back, Patricia!</h1>
                <p className="text-on-surface-variant mt-1">
                  Find trusted teachers for your child during school breaks.
                </p>
              </div>

              {/* Search bar card */}
              <div className="mt-8 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20">
                <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                  Find Available Teachers
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="search-date-from"
                      className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                    >
                      Date From
                    </label>
                    <input
                      id="search-date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="search-date-to"
                      className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                    >
                      Date To
                    </label>
                    <input
                      id="search-date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Classroom
                    </label>
                    <select
                      value={classroom}
                      onChange={(e) => setClassroom(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option>All Classrooms</option>
                      <option>Sunflower</option>
                      <option>Butterfly</option>
                      <option>Rainbow</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSearch}
                    className="w-full md:w-auto bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-3 rounded-xl font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Search Teachers
                  </button>
                </div>
              </div>

              {/* My Children section */}
              <div className="mt-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-surface">My Children</h2>
                  <button
                    onClick={() => setShowAddChildModal(true)}
                    className="text-primary text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Add Child
                  </button>
                </div>

                {children.length === 0 ? (
                  <p className="text-sm text-on-surface-variant mt-4">No children added yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm"
                      >
                        {/* Avatar + name/age + delete */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface text-lg leading-tight">
                              {child.name}
                            </p>
                            <p className="text-sm text-on-surface-variant mt-0.5">
                              {formatAge(child.age)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteChild(child.id)}
                            aria-label={`Delete ${child.name}`}
                            className="p-1.5 rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-all flex-shrink-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>

                        {/* Classroom */}
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            door_open
                          </span>
                          <span>{child.classroom}</span>
                        </div>

                        {/* Notes */}
                        {child.notes && (
                          <div className="flex items-start gap-2 text-sm text-on-surface-variant mt-2">
                            <span className="material-symbols-outlined text-error text-[18px] flex-shrink-0 mt-0.5">
                              medical_services
                            </span>
                            <span>{child.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Requests section */}
              <div className="mt-10">
                <h2 className="text-xl font-bold text-on-surface mb-4">Active Requests</h2>
                {bookings.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No active requests.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 shadow-sm flex items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                            {booking.status === "confirmed"
                              ? "check_circle"
                              : booking.status === "declined"
                                ? "cancel"
                                : "schedule"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-on-surface text-sm">
                            {booking.teacher_name
                              ? `Care with ${booking.teacher_name}`
                              : "Booking Request"}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {booking.start_date}
                            {booking.start_time ? ` · ${booking.start_time.slice(0, 5)}` : ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                              booking.status === "confirmed"
                                ? "bg-tertiary text-on-tertiary"
                                : booking.status === "declined"
                                  ? "bg-error text-on-error"
                                  : "bg-secondary text-on-secondary"
                            }`}
                          >
                            {booking.status}
                          </span>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {formatRelative(booking.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: AI Match */}
            <div className="lg:col-span-1 mt-10 lg:mt-0">
              <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-on-surface">AI Match</h2>
                  <span
                    className="material-symbols-outlined text-secondary text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mb-4">For Lily · Jun 16–20</p>

                <div className="flex flex-col gap-4">
                  {aiSuggestions.map((teacher) => (
                    <div key={teacher.name} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {teacher.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-on-surface">{teacher.name}</p>
                          <span className="bg-secondary-fixed text-secondary text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                            {teacher.rank}
                          </span>
                        </div>
                        <p className="italic text-xs text-on-surface-variant border-l-2 border-secondary-container pl-2 mt-1.5">
                          {teacher.reasoning}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push("/search")}
                  className="w-full mt-4 border border-primary text-primary rounded-xl py-2.5 text-sm font-bold hover:bg-primary-fixed/30 transition-all"
                >
                  View All Matches
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />

      {showAddChildModal && (
        <AddChildModal onClose={() => setShowAddChildModal(false)} onAdd={handleChildAdded} />
      )}
    </>
  );
}
