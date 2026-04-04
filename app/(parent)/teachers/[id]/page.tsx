"use client";

import { useState, useEffect, use } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AvailabilitySlot {
  id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_booked: boolean;
  created_at: string;
}

interface TeacherProfile {
  id: string;
  classroom: string;
  bio: string;
  hourly_rate: number | null;
  full_name: string | null;
  position: string | null;
  name: string; // email-derived
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function emailToName(email: string): string {
  const local = email.includes("@") ? email.split("@")[0] : email;
  return local
    .split(/[._\-]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function getDisplayName(teacher: TeacherProfile): string {
  return teacher.full_name ?? emailToName(teacher.name);
}

function getFirstName(displayName: string): string {
  const honorifics = new Set(["ms.", "mr.", "mrs.", "dr.", "prof."]);
  const words = displayName.split(/\s+/);
  return words.find((w) => !honorifics.has(w.toLowerCase())) ?? words[0];
}

function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
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
          <Link
            href="/dashboard"
            className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm select-none hover:opacity-80 transition-opacity"
            aria-label="Go to dashboard"
          >
            P
          </Link>
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

// ── TeacherProfilePage ─────────────────────────────────────────────────────────

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/teachers/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then(
        (data: {
          teacher?: TeacherProfile;
          availability?: AvailabilitySlot[];
          error?: { code: string };
        }) => {
          if (data.error || !data.teacher) {
            setNotFound(true);
            return;
          }
          setTeacher(data.teacher);
          setAvailability(data.availability ?? []);
        }
      )
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const displayName = teacher ? getDisplayName(teacher) : "";
  const initials = teacher ? getInitials(displayName) : "?";
  const position = teacher?.position ?? "Preschool Teacher";

  const bookingHref = teacher
    ? `/bookings/new?teacher_id=${encodeURIComponent(teacher.id)}` +
      `&teacher_name=${encodeURIComponent(displayName)}` +
      `&classroom=${encodeURIComponent(teacher.classroom)}` +
      (availability.length > 0
        ? `&availability=${encodeURIComponent(JSON.stringify(availability.map((a) => ({ start_date: a.start_date, end_date: a.end_date, start_time: a.start_time, end_time: a.end_time }))))}`
        : "")
    : "#";

  return (
    <>
      <Navbar />
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-8 pb-6">
          {/* Back link */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </button>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                progress_activity
              </span>
            </div>
          )}

          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-5xl text-error mb-4">person_off</span>
              <p className="text-on-surface font-semibold text-lg">Teacher not found.</p>
              <Link
                href="/search"
                className="mt-6 bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all"
              >
                Back to Search
              </Link>
            </div>
          )}

          {!loading && teacher && (
            <>
              {/* Header card */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-3xl flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-on-surface">{displayName}</h1>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px] text-tertiary">
                        verified
                      </span>
                      <span className="text-sm text-tertiary font-medium">{position}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                        school
                      </span>
                      <span className="text-sm text-on-surface-variant">
                        {teacher.classroom} Room
                      </span>
                    </div>
                    {teacher.hourly_rate != null && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                          payments
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          ${teacher.hourly_rate}/hr
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {teacher.bio && (
                  <div className="mt-5 pt-5 border-t border-outline-variant/15">
                    <p className="text-sm text-on-surface leading-relaxed">{teacher.bio}</p>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm mb-6">
                <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    event_available
                  </span>
                  Available Dates
                </h2>
                {availability.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No availability posted yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {availability.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-3 text-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3"
                      >
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          calendar_today
                        </span>
                        <span>
                          {formatDate(slot.start_date)}
                          {" – "}
                          {formatDate(slot.end_date)}
                          {slot.start_time && slot.end_time && (
                            <span className="text-on-surface-variant/70 ml-1">
                              · {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Book CTA */}
              <Link
                href={bookingHref}
                className="block w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all text-sm text-center"
              >
                Request {getFirstName(displayName)}
              </Link>
            </>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
