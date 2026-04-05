"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

// ── EditChildModal ─────────────────────────────────────────────────────────────

interface EditChildModalProps {
  child: ChildData;
  onClose: () => void;
  onUpdate: (child: ChildData) => void;
  onDelete: (id: string) => void;
}

function EditChildModal({ child, onClose, onUpdate, onDelete }: EditChildModalProps) {
  const [name, setName] = useState(child.name);
  const [age, setAge] = useState(String(child.age));
  const [classroom, setClassroom] = useState(child.classroom);
  const [notes, setNotes] = useState(child.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !classroom.trim() || !age) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
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
        setError(data?.error?.message ?? "Failed to update child");
        return;
      }
      onUpdate(data.child);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/children/${child.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(child.id);
      onClose();
    } else {
      setError("Failed to delete child");
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Child"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl border border-outline-variant/20">
        <h2 className="text-lg font-bold text-on-surface mb-5">Edit Child</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-child-name"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Name
            </label>
            <input
              id="edit-child-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Child's name"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-child-age"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Age
            </label>
            <input
              id="edit-child-age"
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
              htmlFor="edit-child-classroom"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Classroom
            </label>
            <input
              id="edit-child-classroom"
              type="text"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="e.g. Sunflower"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-child-notes"
              className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Notes
            </label>
            <textarea
              id="edit-child-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, nap schedule, special needs…"
              rows={3}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-error mt-3">{error}</p>}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting || submitting}
          className="w-full mt-5 border border-error/40 text-error px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-error-container transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          {deleting ? "Deleting…" : `Delete ${child.name}`}
        </button>

        <div className="mt-3 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting || deleting}
            className="flex-1 border border-outline-variant/40 text-on-surface-variant px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || deleting}
            className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
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
  const router = useRouter();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildData | null>(null);
  const [saveToast, setSaveToast] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Load current user email from Supabase on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  // Load children from API on mount
  useEffect(() => {
    fetch("/api/children")
      .then((r) => r.json())
      .then((data) => {
        if (data.children) setChildren(data.children);
      })
      .catch(() => {});
  }, []);

  const handleChildAdded = (child: ChildData) => {
    setChildren((prev) => [...prev, child]);
  };

  const handleChildUpdated = (updated: ChildData) => {
    setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleChildDeleted = (id: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const showToast = (type: "success" | "error", message: string) => {
    setSaveToast({ type, message });
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveChanges = () => {
    if (showChangePassword && newPassword.length > 0 && newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      showToast("error", "Password must be at least 8 characters.");
      return;
    }
    setPasswordError(null);
    // In production this would call /api/auth/update-password and /api/auth/update-email
    showToast("success", "Changes saved successfully.");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <Navbar />
      <div className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Profile header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-on-surface">Patricia Johnson</h1>
            <p className="text-on-surface-variant mt-1">
              Managing family care and educational enrichment at Sunshine Preschool.
            </p>
          </div>

          {/* Main grid */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-8 mt-2">
            {/* Main column: My Children */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-on-surface">My Children</h2>
                <button
                  onClick={() => setShowAddChildModal(true)}
                  className="text-primary text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Add Child
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm"
                  >
                    {/* Avatar + name/age + edit */}
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
                        onClick={() => setEditingChild(child)}
                        aria-label={`Edit ${child.name}`}
                        className="p-1.5 rounded-full text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-all flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
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
            </div>

            {/* Sidebar: Account Settings */}
            <div className="lg:col-span-1 mt-8 lg:mt-0">
              <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    manage_accounts
                  </span>
                  <h2 className="text-lg font-bold text-on-surface">Account Settings</h2>
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label htmlFor="profile-email" className="text-xs text-on-surface-variant">
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Password row */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label htmlFor="profile-password" className="text-xs text-on-surface-variant">
                    Password
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5">
                    <input
                      id="profile-password"
                      type="password"
                      value={showChangePassword ? newPassword : "••••••••••••"}
                      onChange={(e) => {
                        if (showChangePassword) setNewPassword(e.target.value);
                      }}
                      readOnly={!showChangePassword}
                      placeholder={showChangePassword ? "New password" : undefined}
                      className="flex-1 text-sm text-on-surface bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword((v) => !v);
                        setNewPassword("");
                        setPasswordError(null);
                      }}
                      className="text-xs font-bold text-primary uppercase tracking-wider hover:opacity-70 transition-opacity flex-shrink-0"
                    >
                      {showChangePassword ? "Cancel" : "Change"}
                    </button>
                  </div>
                  {showChangePassword && (
                    <p className="text-xs text-on-surface-variant">
                      Enter a new password (min 8 characters)
                    </p>
                  )}
                  {passwordError && <p className="text-xs text-error">{passwordError}</p>}
                </div>

                <button
                  onClick={handleSaveChanges}
                  className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm mt-1 hover:opacity-90 active:scale-95 transition-all"
                >
                  Save Changes
                </button>

                {saveToast && (
                  <div
                    className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      saveToast.type === "success"
                        ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary"
                        : "bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] text-error"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {saveToast.type === "success" ? "check_circle" : "error"}
                    </span>
                    {saveToast.message}
                  </div>
                )}

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="w-full mt-4 text-sm font-bold text-error hover:opacity-70 transition-opacity"
                >
                  Sign Out
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

      {editingChild && (
        <EditChildModal
          child={editingChild}
          onClose={() => setEditingChild(null)}
          onUpdate={handleChildUpdated}
          onDelete={handleChildDeleted}
        />
      )}
    </>
  );
}
