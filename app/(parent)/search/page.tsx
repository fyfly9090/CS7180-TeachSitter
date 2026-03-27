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

function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 animate-pulse"
        >
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-surface-container flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-surface-container rounded-lg w-1/3" />
              <div className="h-4 bg-surface-container rounded-lg w-1/4" />
              <div className="h-4 bg-surface-container rounded-lg w-2/3" />
              <div className="h-4 bg-surface-container rounded-lg w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">
        search_off
      </span>
      <p className="text-on-surface font-semibold text-lg">
        No teachers available for these dates.
      </p>
      <p className="text-on-surface-variant text-sm mt-1">Try widening your date range.</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-symbols-outlined text-5xl text-error mb-4">error_outline</span>
      <p className="text-on-surface font-semibold text-lg">Something went wrong.</p>
      <p className="text-on-surface-variant text-sm mt-1">Please try again in a moment.</p>
    </div>
  );
}

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

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
          {getInitials(teacher.name)}
        </div>

        {/* Details */}
        <div className="flex-1">
          {/* Name + verified badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-on-surface">{teacher.name}</h3>
            <span className="bg-primary-fixed text-primary text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              Verified
            </span>
          </div>

          {/* Classroom */}
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
              school
            </span>
            <span className="text-sm text-on-surface-variant">{teacher.classroom} Class</span>
          </div>

          {/* Bio */}
          <p className="text-sm text-on-surface-variant mt-1 truncate">{teacher.bio}</p>

          {/* Availability row */}
          {teacher.availability.length > 0 && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {teacher.availability.map((slot, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                    calendar_today
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {formatDateRange(slot.start_date, slot.end_date)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* AI reasoning box — only when reasoning is present */}
          {teacher.reasoning && (
            <div
              data-testid="ai-reasoning"
              className="mt-2 bg-surface-container rounded-xl p-3 border-l-4 border-secondary-container"
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
          <div className="flex gap-2 mt-3 flex-wrap">
            <Link
              href={bookingHref}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Request Booking
            </Link>
            <button className="border border-outline-variant/30 text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-fixed/20 transition-all">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherList({
  teachers,
  dateFrom,
  dateTo,
}: {
  teachers: TeacherResult[];
  dateFrom: string;
  dateTo: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {teachers.map((teacher) => (
        <TeacherCard key={teacher.id} teacher={teacher} dateFrom={dateFrom} dateTo={dateTo} />
      ))}
    </div>
  );
}

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
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-8 pb-6">
          <h1 className="font-headline text-4xl md:text-5xl text-primary font-bold tracking-tight">
            Find a familiar face
          </h1>
          <p className="text-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Choose from teachers your child already knows and loves from their daily classroom
            adventures.
          </p>

          {/* Filter bar */}
          <div className="bg-surface-container-low rounded-xl p-4 md:p-6 mb-6 mt-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                <label
                  htmlFor="date-from"
                  className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1"
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
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                <label
                  htmlFor="date-to"
                  className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1"
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
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                <label
                  htmlFor="classroom"
                  className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1"
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
              <div className="w-full md:w-auto">
                <button
                  onClick={handleUpdateResults}
                  className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all text-sm"
                >
                  Update Results
                </button>
              </div>
            </div>
          </div>

          {/* Result states */}
          {loading && <LoadingSkeleton />}
          {!loading && error && <ErrorState />}
          {!loading && !error && teachers.length === 0 && <EmptyState />}
          {!loading && !error && teachers.length > 0 && (
            <TeacherList teachers={teachers} dateFrom={dateFrom} dateTo={dateTo} />
          )}
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
