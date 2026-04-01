"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChildData {
  id: string;
  name: string;
  classroom: string;
  age: number;
  notes?: string;
}

function formatAge(age: number): string {
  return age === 1 ? "1 Year Old" : `${age} Years Old`;
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

// ── ProfilePage ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showAddChildModal, setShowAddChildModal] = useState(false);

  // Load children from API on mount
  useEffect(() => {
    fetch("/api/children")
      .then((r) => r.json())
      .then((data) => {
        if (data.children) setChildren(data.children);
      })
      .catch(() => {});
  }, []);

  const handleDeleteChild = async (id: string) => {
    const res = await fetch(`/api/children/${id}`, { method: "DELETE" });
    if (res.ok) {
      setChildren((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleChildAdded = (child: ChildData) => {
    setChildren((prev) => [...prev, child]);
  };

  const handleSaveChanges = () => {
    if (!newPassword && !currentPassword) return;

    if (newPassword.length > 0 && newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (newPassword && !currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    setPasswordError(null);
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

                    <button className="text-xs text-primary font-semibold mt-3 hover:opacity-80 transition-opacity block">
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              {/* Add a Child button */}
              <button
                onClick={() => setShowAddChildModal(true)}
                className="mt-4 w-full border-2 border-dashed border-outline-variant/40 rounded-2xl py-5 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-fixed/20 transition-all"
              >
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
                  <label
                    htmlFor="profile-email"
                    className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <input
                    id="profile-email"
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
                    <label htmlFor="current-password" className="text-xs text-on-surface-variant">
                      Current Password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-password" className="text-xs text-on-surface-variant">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  {passwordError && <p className="text-xs text-error">{passwordError}</p>}
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

      {showAddChildModal && (
        <AddChildModal onClose={() => setShowAddChildModal(false)} onAdd={handleChildAdded} />
      )}
    </>
  );
}
