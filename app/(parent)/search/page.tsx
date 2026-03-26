"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

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

interface Teacher {
  id: string;
  initials: string;
  name: string;
  classroom: string;
  bio: string;
  availability: string;
  hours: string;
  reasoning: string;
}

const SAMPLE_TEACHERS: Teacher[] = [
  {
    id: "1",
    initials: "TS",
    name: "Ms. Tara Smith",
    classroom: "Sunflower",
    bio: "5 years teaching preschool. Loves art and outdoor play.",
    availability: "Jun 16–20",
    hours: "8am–5pm",
    reasoning: "Same classroom as Lily — highest familiarity match.",
  },
  {
    id: "2",
    initials: "RC",
    name: "Ms. Rachel Chen",
    classroom: "Butterfly",
    bio: "Certified early childhood educator with a nurturing style.",
    availability: "Jun 16–20",
    hours: "9am–3pm",
    reasoning: "Strong availability overlap with your requested dates.",
  },
  {
    id: "3",
    initials: "JP",
    name: "Mr. James Park",
    classroom: "Rainbow",
    bio: "Energetic teacher passionate about STEM for little learners.",
    availability: "Jun 18–20",
    hours: "8am–4pm",
    reasoning: "Profile completeness score: excellent.",
  },
];

export default function SearchPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [classroom, setClassroom] = useState("All Classrooms");

  const handleUpdateResults = () => {
    // In production this would refetch with new filter params
  };

  return (
    <>
      <Navbar />
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        {/* Page header */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-8 pb-6">
          <h1 className="text-3xl font-bold text-on-surface">Find a Teacher</h1>
          <p className="text-on-surface-variant mt-1">
            Showing available teachers for your child&apos;s school breaks.
          </p>

          {/* Filter bar */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 mt-6 border border-outline-variant/20 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Classroom
                </label>
                <select
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option>All Classrooms</option>
                  <option>Sunflower</option>
                  <option>Butterfly</option>
                  <option>Rainbow</option>
                </select>
              </div>
              <button
                onClick={handleUpdateResults}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                Update Results
              </button>
            </div>
          </div>

          {/* Teacher cards list */}
          <div className="flex flex-col gap-4">
            {SAMPLE_TEACHERS.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
                    {teacher.initials}
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
                      <span className="text-sm text-on-surface-variant">
                        {teacher.classroom} Class
                      </span>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-on-surface-variant mt-1 truncate">{teacher.bio}</p>

                    {/* Availability row */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                          calendar_today
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {teacher.availability}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                          schedule
                        </span>
                        <span className="text-xs text-on-surface-variant">{teacher.hours}</span>
                      </div>
                    </div>

                    {/* AI reasoning box */}
                    <div className="mt-2 bg-surface-container rounded-xl p-3 border-l-4 border-secondary-container">
                      <div className="flex items-start gap-2">
                        <span
                          className="material-symbols-outlined text-secondary-container text-lg flex-shrink-0"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          auto_awesome
                        </span>
                        <p className="italic text-xs text-on-surface-variant">
                          {teacher.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
                        Request Booking
                      </button>
                      <button className="border border-outline-variant/30 text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-fixed/20 transition-all">
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
