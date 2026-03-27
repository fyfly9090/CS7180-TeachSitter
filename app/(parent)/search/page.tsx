"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { TeacherWithAvailability } from "@/types";

type TeacherResult = TeacherWithAvailability & { reasoning?: string };

function getInitials(name: string): string {
  const words = name.split(/[\s.@]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Deterministic colour per teacher so cards don't all look the same
const AVATAR_PALETTES = [
  "from-blue-300 to-blue-500",
  "from-emerald-300 to-emerald-500",
  "from-violet-300 to-violet-500",
  "from-rose-300 to-rose-500",
  "from-amber-300 to-amber-500",
];
function avatarGradient(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

// ── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Search Teachers", href: "/search" },
    { label: "My Bookings", href: "/bookings" },
    { label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-orange-50/85 backdrop-blur-md shadow-sm glass-nav">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className="text-2xl font-bold tracking-tight text-blue-900 font-serif"
        >
          TeachSitter
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-blue-700 font-bold border-b-2 border-orange-700 pb-1 hover:text-blue-800 transition-colors duration-200"
                    : "text-slate-600 font-medium hover:text-blue-800 transition-colors duration-200"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          <button
            className="p-2 text-slate-600 hover:bg-orange-100 rounded-full transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button
            className="p-2 text-slate-600 hover:bg-orange-100 rounded-full transition-colors"
            aria-label="Messages"
          >
            <span className="material-symbols-outlined">chat_bubble</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm select-none border border-outline-variant/15">
            P
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Mobile bottom nav ───────────────────────────────────────────────────────

function MobileBottomNav() {
  const pathname = usePathname();

  const items = [
    { label: "Search", icon: "search", href: "/search" },
    { label: "Bookings", icon: "event_note", href: "/bookings" },
    { label: "Inbox", icon: "mail", href: "/inbox" },
    { label: "Profile", icon: "person_outline", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 md:hidden bg-orange-50/90 backdrop-blur-lg shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-t-2xl z-50">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "flex flex-col items-center justify-center bg-blue-100 text-blue-900 rounded-xl px-4 py-1"
                : "flex flex-col items-center justify-center text-slate-500"
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-xs font-semibold font-body">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── States ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" className="space-y-12">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col md:flex-row bg-surface-container-lowest rounded-2xl overflow-hidden animate-pulse"
          style={{ boxShadow: "0 8px 32px rgba(28,28,25,0.06)" }}
        >
          <div className="md:w-72 h-64 md:h-auto bg-surface-container flex-shrink-0" />
          <div className="flex-1 p-6 md:p-8 space-y-4">
            <div className="h-8 bg-surface-container rounded-lg w-1/2" />
            <div className="h-4 bg-surface-container rounded-lg w-1/3" />
            <div className="h-20 bg-surface-container rounded-xl w-full" />
            <div className="flex gap-4 mt-auto pt-4">
              <div className="h-11 bg-surface-container rounded-xl flex-1" />
              <div className="h-11 bg-surface-container rounded-xl w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
        search_off
      </span>
      <p className="text-on-surface font-semibold text-xl">No teachers available for these dates.</p>
      <p className="text-on-surface-variant mt-2">Try widening your date range.</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-6xl text-error mb-4">error_outline</span>
      <p className="text-on-surface font-semibold text-xl">Something went wrong.</p>
      <p className="text-on-surface-variant mt-2">Please try again in a moment.</p>
    </div>
  );
}

// ── Teacher Card ────────────────────────────────────────────────────────────

function TeacherCard({
  teacher,
  dateFrom,
  dateTo,
}: {
  teacher: TeacherResult;
  dateFrom: string;
  dateTo: string;
}) {
  const bookingHref =
    `/bookings/new?teacher_id=${teacher.id}` +
    `&teacher_name=${encodeURIComponent(teacher.name)}` +
    `&classroom=${encodeURIComponent(teacher.classroom)}` +
    (dateFrom ? `&start_date=${dateFrom}` : "") +
    (dateTo ? `&end_date=${dateTo}` : "");

  const initials = getInitials(teacher.name);
  const gradient = avatarGradient(teacher.id);

  return (
    <article
      className="group relative flex flex-col md:flex-row bg-surface-container-lowest rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
      style={{ boxShadow: "0 8px 32px rgba(28,28,25,0.06)" }}
    >
      {/* Left photo panel */}
      <div className="md:w-72 h-64 md:h-auto overflow-hidden relative flex-shrink-0">
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
        >
          <span className="text-white font-bold text-6xl select-none drop-shadow-sm">
            {initials}
          </span>
        </div>
        {/* Verified badge — overlaid on photo */}
        <div className="absolute top-4 left-4">
          <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            Verified
          </span>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 p-6 md:p-8 flex flex-col">
        {/* Name + classroom row */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-headline text-3xl text-primary font-bold">{teacher.name}</h2>
            <p className="text-on-surface-variant font-medium mt-0.5">
              {teacher.classroom} Class
            </p>
          </div>
          {/* Availability pill */}
          {teacher.availability.length > 0 && (
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-xs font-semibold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded-md">
                {formatDateRange(
                  teacher.availability[0].start_date,
                  teacher.availability[0].end_date
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bio */}
        <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">{teacher.bio}</p>

        {/* AI reasoning box */}
        {teacher.reasoning && (
          <div
            data-testid="ai-reasoning"
            className="bg-surface-container p-4 rounded-xl border-l-4 border-secondary-container mb-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="material-symbols-outlined text-secondary-container text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <span className="text-xs font-bold text-on-secondary-container uppercase tracking-tight">
                AI Match Reasoning
              </span>
            </div>
            <p className="text-sm text-on-surface leading-relaxed italic">{teacher.reasoning}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto flex flex-col sm:flex-row gap-4">
          <Link
            href={bookingHref}
            className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl active:scale-95 transition-all text-center"
          >
            Request Booking
          </Link>
          <button className="px-6 py-3 border border-outline-variant/30 text-primary font-bold rounded-xl hover:bg-surface-container-low transition-colors">
            View Profile
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Search Page ─────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [classroom, setClassroom] = useState("");
  const [teachers, setTeachers] = useState<TeacherResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTeachers = useCallback(
    async (params: { start_date?: string; end_date?: string; classroom?: string }) => {
      setLoading(true);
      setError(false);
      try {
        const query = new URLSearchParams();
        if (params.start_date) query.set("start_date", params.start_date);
        if (params.end_date) query.set("end_date", params.end_date);
        if (params.classroom) query.set("classroom", params.classroom);
        const res = await fetch(`/api/teachers/available?${query.toString()}`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = (await res.json()) as { teachers: TeacherResult[] };
        setTeachers(data.teachers ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchTeachers({});
  }, [fetchTeachers]);

  const handleUpdateResults = () => {
    void fetchTeachers({
      start_date: dateFrom || undefined,
      end_date: dateTo || undefined,
      classroom: classroom || undefined,
    });
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-32 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="font-headline text-5xl md:text-6xl text-primary font-bold tracking-tight mb-4">
            Find a familiar face
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Choose from teachers your child already knows and loves from their daily classroom
            adventures.
          </p>
        </header>

        {/* Filter Bar */}
        <section
          className="bg-surface-container-low rounded-xl p-4 md:p-6 mb-12"
          style={{ boxShadow: "0 8px 32px rgba(28,28,25,0.06)" }}
        >
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Date range — two inputs under one label group */}
            <div className="w-full md:w-1/3">
              <span className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                Date Range
              </span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                    calendar_today
                  </span>
                  <label htmlFor="date-from" className="sr-only">
                    Date From
                  </label>
                  <input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-10 pr-2 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                  />
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                    calendar_today
                  </span>
                  <label htmlFor="date-to" className="sr-only">
                    Date To
                  </label>
                  <input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-10 pr-2 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Classroom */}
            <div className="w-full md:w-1/3">
              <label
                htmlFor="classroom"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 ml-1"
              >
                Classroom
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  child_care
                </span>
                <select
                  id="classroom"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                >
                  <option value="">All Classrooms</option>
                  <option value="Sunflower">Sunflower</option>
                  <option value="Butterfly">Butterfly</option>
                  <option value="Rainbow">Rainbow</option>
                </select>
              </div>
            </div>

            {/* Update button */}
            <div className="w-full md:w-1/3">
              <button
                onClick={handleUpdateResults}
                className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                Update Results
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        {loading && <LoadingSkeleton />}
        {!loading && error && <ErrorState />}
        {!loading && !error && teachers.length === 0 && <EmptyState />}
        {!loading && !error && teachers.length > 0 && (
          <div className="space-y-12">
            {teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            ))}
          </div>
        )}
      </main>
      <MobileBottomNav />
    </>
  );
}
