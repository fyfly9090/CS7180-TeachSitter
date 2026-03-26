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

interface Child {
  name: string;
  initials: string;
  classroom: string;
  age: number;
}

const children: Child[] = [
  { name: "Lily", initials: "L", classroom: "Sunflower", age: 4 },
  { name: "Oliver", initials: "O", classroom: "Butterfly", age: 3 },
];

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSaveChanges = () => {
    // In production this would call /api/auth/update-password
  };

  return (
    <>
      <Navbar />
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Profile header card */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 mb-6 border border-outline-variant/20 shadow-sm">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-3xl flex-shrink-0">
                PJ
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-on-surface">Patricia Johnson</h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                    school
                  </span>
                  <span className="text-sm text-on-surface-variant">Sunshine Preschool</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                    person
                  </span>
                  <span className="text-sm text-on-surface-variant font-medium">Parent</span>
                </div>
              </div>
              <button className="border border-outline-variant/30 text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-fixed/20 transition-all ml-auto flex-shrink-0">
                Edit Profile
              </button>
            </div>
          </div>

          {/* Main grid */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-8 mt-2">
            {/* Main column: My Children */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-on-surface mb-4">My Children</h2>

              <div className="grid grid-cols-2 gap-4">
                {children.map((child) => (
                  <div
                    key={child.name}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl mb-3">
                      {child.initials}
                    </div>
                    <p className="font-bold text-on-surface">{child.name}</p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-tertiary-fixed rounded-full text-xs font-bold text-on-tertiary-container mt-1.5">
                      <span className="material-symbols-outlined text-[12px]">school</span>
                      {child.classroom}
                    </span>
                    <p className="text-sm text-on-surface-variant mt-1.5">Age {child.age}</p>
                    <button className="text-xs text-primary font-semibold mt-2 hover:opacity-80 transition-opacity block">
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              {/* Add a Child button */}
              <button className="mt-4 w-full border-2 border-dashed border-outline-variant/40 rounded-2xl py-5 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-fixed/20 transition-all">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Add a Child
              </button>
            </div>

            {/* Sidebar: Account Settings */}
            <div className="lg:col-span-1 mt-8 lg:mt-0">
              <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
                <h2 className="text-base font-bold text-on-surface mb-4">Account Settings</h2>

                {/* Email display */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value="patricia@example.com"
                    disabled
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2.5 text-sm text-on-surface-variant cursor-not-allowed"
                  />
                </div>

                {/* Password change */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Change Password
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-on-surface-variant">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-on-surface-variant">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveChanges}
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-3 rounded-xl font-bold text-sm mt-4 hover:opacity-90 active:scale-95 transition-all"
                >
                  Save Changes
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
