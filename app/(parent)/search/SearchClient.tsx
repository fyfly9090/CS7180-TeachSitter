"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { TeacherWithAvailability } from "@/types";

type TeacherResult = TeacherWithAvailability & { reasoning?: string; rank?: number };

/** Derive a display name from email when full_name is not set. */
function emailToName(email: string): string {
  const local = email.includes("@") ? email.split("@")[0] : email;
  return local
    .split(/[._\-]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function getDisplayName(teacher: TeacherResult): string {
  return teacher.full_name ?? emailToName(teacher.name);
}

function getPosition(teacher: TeacherResult): string {
  return teacher.position ?? "Preschool Teacher";
}

/** Extract first name from display name (first word after optional "Ms./Mr./Dr." title). */
function getFirstName(displayName: string): string {
  const words = displayName.split(/\s+/);
  // Skip honorifics
  const honorifics = new Set(["ms.", "mr.", "mrs.", "dr.", "prof."]);
  const first = words.find((w) => !honorifics.has(w.toLowerCase())) ?? words[0];
  return first;
}

function formatTime(t: string): string {
  // t is "HH:MM:SS" from Postgres time type
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const display = hour % 12 || 12;
  return m === "00" ? `${display}${ampm}` : `${display}:${m}${ampm}`;
}

const TEACHER_PHOTOS = [
  "/teachers/teacher-1.png",
  "/teachers/teacher-2.png",
  "/teachers/teacher-3.png",
];
function teacherPhoto(id: string): string {
  const idx = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % TEACHER_PHOTOS.length;
  return TEACHER_PHOTOS[idx];
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
      <p className="text-on-surface font-semibold text-xl">
        No teachers available for these dates.
      </p>
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

// ── Teacher Card ─────────────────────────────────────────────────────────────

function TeacherCard({
  teacher,
  dateFrom,
  dateTo,
}: {
  teacher: TeacherResult;
  dateFrom: string;
  dateTo: string;
}) {
  const displayName = getDisplayName(teacher);
  const position = getPosition(teacher);
  const firstName = getFirstName(displayName);
  const photo = teacherPhoto(teacher.id);

  const bookingHref =
    `/bookings/new?teacher_id=${encodeURIComponent(teacher.id)}` +
    `&teacher_name=${encodeURIComponent(displayName)}` +
    `&classroom=${encodeURIComponent(teacher.classroom)}` +
    (dateFrom ? `&start_date=${encodeURIComponent(dateFrom)}` : "") +
    (dateTo ? `&end_date=${encodeURIComponent(dateTo)}` : "") +
    (teacher.availability.length > 0
      ? `&availability=${encodeURIComponent(JSON.stringify(teacher.availability))}`
      : "");

  const avail = teacher.availability[0];

  return (
    <article
      className="group relative flex flex-col md:flex-row bg-surface-container-lowest rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
      style={{ boxShadow: "0 8px 32px rgba(28,28,25,0.06)" }}
    >
      {/* Left photo panel */}
      <div className="md:w-72 h-56 md:h-auto min-h-[16rem] md:min-h-[20rem] overflow-hidden relative flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={`${displayName} portrait`} className="w-full h-full object-cover" />
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
        {teacher.rank != null && (
          <div className="absolute top-4 right-4">
            <span
              data-testid={`rank-badge-${teacher.rank}`}
              className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              #{teacher.rank} Match
            </span>
          </div>
        )}
      </div>

      {/* Right content */}
      <div className="flex-1 p-6 md:p-8 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-headline text-2xl md:text-3xl text-primary font-bold">
              {displayName}
            </h2>
            <p className="text-on-surface-variant font-medium mt-0.5">
              {position} • {teacher.classroom}
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            {teacher.hourly_rate != null && (
              <div className="text-2xl font-bold text-secondary">
                ${teacher.hourly_rate.toFixed(0)}
                <span className="text-sm font-normal text-on-surface-variant">/hour</span>
              </div>
            )}
            {avail?.start_time && avail?.end_time && (
              <div className="text-xs font-semibold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded-md mt-1 text-right">
                Available {formatTime(avail.start_time)} – {formatTime(avail.end_time)}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">{teacher.bio}</p>

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

        <div className="mt-auto flex flex-col sm:flex-row gap-3">
          <Link
            href={bookingHref}
            className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl active:scale-95 transition-all text-center hover:opacity-90"
          >
            Book {firstName}
          </Link>
          <button className="px-6 py-3 border border-outline-variant/30 text-primary font-bold rounded-xl hover:bg-surface-container-low transition-colors">
            View Profile
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Search Client ─────────────────────────────────────────────────────────────

export default function SearchClient({
  initialTeachers,
  initialError,
  initialDateFrom,
  initialDateTo,
  initialClassroom,
  parentId = "",
}: {
  initialTeachers: TeacherResult[];
  initialError: boolean;
  initialDateFrom: string;
  initialDateTo: string;
  initialClassroom: string;
  parentId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [classroom, setClassroom] = useState(initialClassroom);
  // aiResult holds the ranked list for a specific searchKey.
  // displayTeachers falls back to initialTeachers when aiResult is for a different search —
  // no synchronous setState needed inside effects.
  const [aiResult, setAiResult] = useState<{
    searchKey: string;
    teachers: TeacherResult[];
  } | null>(null);
  // aiSettledKey records which search has completed (success or failure). Deriving
  // isAiRanking from this avoids any synchronous setState inside the effect.
  const [aiSettledKey, setAiSettledKey] = useState<string | null>(null);

  // searchKey changes when the server sends new search params (new page render).
  const searchKey = `${initialDateFrom}|${initialDateTo}|${initialClassroom}`;

  // Derived state — no extra setState calls needed:
  const wouldRank = Boolean(
    parentId && initialDateFrom && initialDateTo && initialTeachers.length > 0
  );
  const displayTeachers = aiResult?.searchKey === searchKey ? aiResult.teachers : initialTeachers;
  const isAiRanking = wouldRank && aiSettledKey !== searchKey;

  useEffect(() => {
    // Skip AI ranking when unauthenticated, dates missing, or no teachers.
    if (!parentId || !initialDateFrom || !initialDateTo || initialTeachers.length === 0) return;

    const controller = new AbortController();

    // Snapshot values needed for the async call so they can't change mid-flight.
    const capturedKey = searchKey;
    const teachers = initialTeachers;
    const body = JSON.stringify({
      parent_id: parentId,
      child_classroom: initialClassroom,
      start_date: initialDateFrom,
      end_date: initialDateTo,
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.full_name ?? t.name,
        classroom: t.classroom,
        bio: (t.bio ?? "").slice(0, 2000),
      })),
    });

    fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) return; // graceful degradation — keep unranked list
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const ranked: { id: string; rank: number; reasoning: string }[] = data.ranked_teachers;
        const rankMap = new Map(ranked.map((r) => [r.id, r]));
        setAiResult({
          searchKey: capturedKey,
          teachers: [...teachers]
            .sort((a, b) => {
              const ra = rankMap.get(a.id)?.rank ?? Infinity;
              const rb = rankMap.get(b.id)?.rank ?? Infinity;
              return ra - rb;
            })
            .map((t) => {
              const r = rankMap.get(t.id);
              return r ? { ...t, rank: r.rank, reasoning: r.reasoning } : t;
            }),
        });
      })
      .catch(() => {
        /* graceful degradation — initialTeachers already shown */
      })
      .finally(() => {
        // Mark search as settled (success or failure) so isAiRanking → false.
        if (!controller.signal.aborted) setAiSettledKey(capturedKey);
      });

    return () => {
      controller.abort();
    };
  }, [searchKey]);

  const handleUpdateResults = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("start_date", dateFrom);
    if (dateTo) params.set("end_date", dateTo);
    if (classroom) params.set("classroom", classroom);
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-32 px-4 max-w-5xl mx-auto">
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
        <section className="bg-surface-container-low rounded-xl p-4 md:p-6 mb-12 ambient-shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label
                htmlFor="date-from"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 ml-1"
              >
                Date From
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  calendar_today
                </span>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="date-to"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 ml-1"
              >
                Date To
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  calendar_today
                </span>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                />
              </div>
            </div>

            <div>
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

            <div>
              <button
                onClick={handleUpdateResults}
                disabled={isPending}
                className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {isPending ? "Searching…" : "Update Results"}
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        {isPending && <LoadingSkeleton />}
        {!isPending && initialError && <ErrorState />}
        {!isPending && !initialError && displayTeachers.length === 0 && <EmptyState />}
        {!isPending && !initialError && displayTeachers.length > 0 && (
          <>
            {isAiRanking && (
              <div
                data-testid="ai-ranking-loading"
                className="flex items-center gap-2 mb-6 px-4 py-3 bg-surface-container rounded-xl text-sm text-on-surface-variant"
              >
                <span
                  className="material-symbols-outlined text-secondary-container text-xl animate-spin"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <span>AI is ranking your matches…</span>
              </div>
            )}
            <div className="space-y-12">
              {displayTeachers.map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <MobileBottomNav />
    </>
  );
}
