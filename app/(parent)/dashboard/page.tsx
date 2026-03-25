"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors" aria-label="Notifications">
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
              <span className="text-[10px] font-semibold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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

const children = [
  { name: "Lily", age: 4, classroom: "Sunflower", initials: "L" },
  { name: "Oliver", age: 3, classroom: "Butterfly", initials: "O" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [classroom, setClassroom] = useState("All Classrooms");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("start_date", dateFrom);
    if (dateTo) params.set("end_date", dateTo);
    if (classroom !== "All Classrooms") params.set("classroom", classroom);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <>
      <Navbar />
      <div className="bg-background min-h-screen pt-16 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

          {/* Top-level lg grid: main content + sidebar */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">

            {/* Main content: col-span-2 */}
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
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  <button className="text-primary text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity">
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Add Child
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {children.map((child) => (
                    <div
                      key={child.name}
                      className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-2xl mb-3">
                        {child.initials}
                      </div>
                      <p className="text-lg font-bold text-on-surface">{child.name}</p>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-tertiary-fixed rounded-full text-xs font-bold text-on-tertiary-container mt-1.5">
                        <span className="material-symbols-outlined text-[12px]">school</span>
                        {child.classroom}
                      </span>
                      <p className="text-sm text-on-surface-variant mt-1.5">Age {child.age}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: AI Match */}
            <div className="lg:col-span-1 mt-10 lg:mt-0">
              <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-on-surface">AI Match</h2>
                  <span className="material-symbols-outlined text-secondary text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
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
    </>
  );
}
