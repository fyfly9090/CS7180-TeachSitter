"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ALL_EXPERTISE, toggleExpertise } from "@/lib/utils/expertise";
import type { Availability, Teacher } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityBlock {
  // db id — undefined for newly added (unsaved) blocks
  dbId?: string;
  // local key for React rendering
  localId: number;
  from: string;
  to: string;
}

// ---------------------------------------------------------------------------
// Shared Navbar
// ---------------------------------------------------------------------------

function TeacherNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Dashboard", href: "/teacher/dashboard" },
    { label: "Booking Requests", href: "/teacher/requests" },
    { label: "My Profile", href: "/teacher/setup" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 z-50 flex items-center">
      <div className="max-w-5xl mx-auto px-4 md:px-6 w-full flex items-center justify-between">
        <Link
          href="/teacher/dashboard"
          className="font-serif italic font-bold text-xl text-primary"
        >
          TeachSitter
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-primary font-bold border-b-2 border-primary pb-0.5 text-sm"
                    : "text-on-surface-variant hover:text-primary text-sm transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <div className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-sm select-none">
            T
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Shared Mobile Bottom Nav
// ---------------------------------------------------------------------------

function MobileBottomNav() {
  const pathname = usePathname();

  const items = [
    { label: "Dashboard", icon: "dashboard", href: "/teacher/dashboard" },
    { label: "Requests", icon: "pending_actions", href: "/teacher/requests" },
    { label: "Profile", icon: "person", href: "/teacher/setup" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/20 z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 ${
                isActive ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

let _nextLocalId = 1;
function nextLocalId() {
  return _nextLocalId++;
}

export default function TeacherSetupPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Teacher");
  const [classroom, setClassroom] = useState("");
  const [bio, setBio] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Load existing profile on mount
  useEffect(() => {
    fetch("/api/teachers/me")
      .then(async (res) => {
        if (!res.ok) {
          // 404 = new teacher with no profile yet (normal); other errors = unexpected
          if (res.status !== 404) {
            setLoadError("Unable to load your profile. Some information may be missing.");
          }
          return;
        }
        const data = (await res.json()) as { teacher?: Teacher; availability?: Availability[] };
        if (data.teacher) {
          setTeacherId(data.teacher.id);
          setDisplayName(data.teacher.full_name ?? "Teacher");
          setClassroom(data.teacher.classroom ?? "");
          setBio(data.teacher.bio ?? "");
          setSelectedExpertise(data.teacher.expertise ?? []);
        }
        if (data.availability) {
          setAvailability(
            data.availability.map((a) => ({
              dbId: a.id,
              localId: nextLocalId(),
              from: a.start_date,
              to: a.end_date,
            }))
          );
        }
      })
      .catch(() => {
        setLoadError("Unable to load your profile. Some information may be missing.");
      })
      .finally(() => setLoading(false));
  }, []);

  function handleToggleExpertise(tag: string) {
    setSelectedExpertise((prev) => toggleExpertise(prev, tag));
  }

  function addAvailabilityBlock() {
    setAvailability((prev) => [...prev, { localId: nextLocalId(), from: "", to: "" }]);
  }

  function removeAvailabilityBlock(localId: number) {
    setAvailability((prev) => prev.filter((b) => b.localId !== localId));
  }

  function updateBlockDate(localId: number, field: "from" | "to", value: string) {
    setAvailability((prev) =>
      prev.map((b) => (b.localId === localId ? { ...b, [field]: value } : b))
    );
  }

  async function handleSave() {
    setFieldError(null);
    setAvailabilityError(null);
    setError(null);

    if (!classroom.trim()) {
      setFieldError("Classroom name is required");
      return;
    }

    if (availability.length === 0) {
      setAvailabilityError("At least one availability block is required");
      return;
    }

    for (const block of availability) {
      if (!block.from || !block.to) {
        setAvailabilityError("Each availability block must have both a start and end date");
        return;
      }
      // YYYY-MM-DD strings are lexicographically ordered, so string comparison is correct for ISO dates
      if (block.to < block.from) {
        setAvailabilityError("End date must be on or after start date");
        return;
      }
    }

    if (!teacherId) {
      setError("Profile not found — please refresh the page and try again.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroom: classroom.trim(),
          bio: bio.trim() || undefined,
          expertise: selectedExpertise,
          availability: availability.map((b) => ({ start_date: b.from, end_date: b.to })),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TeacherNavbar />
      <MobileBottomNav />

      <main className="pt-16 pb-24 md:pb-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Page header */}
          <h1 className="text-3xl font-bold text-on-surface">My Profile</h1>
          <p className="text-on-surface-variant mt-1">
            Manage your profile and availability to attract the right families.
          </p>

          {loading ? (
            <div className="mt-12 flex justify-center">
              <span className="material-symbols-outlined text-4xl text-outline animate-spin">
                progress_activity
              </span>
            </div>
          ) : (
            <>
              {loadError && (
                <div className="flex items-center gap-2 bg-error-container/20 border border-error/20 rounded-xl px-4 py-3 mt-6">
                  <span className="material-symbols-outlined text-error text-[18px]">
                    error_outline
                  </span>
                  <p className="text-sm text-error">{loadError}</p>
                </div>
              )}
              <div className="grid lg:grid-cols-12 gap-8 mt-8">
                {/* Left — Profile form */}
                <div className="lg:col-span-7">
                  <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm mb-6">
                    {/* Photo upload section */}
                    <div className="flex items-center gap-5 mb-6">
                      <div className="relative flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/placeholder-avatar.png"
                          alt="Profile photo"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center shadow-md">
                          <span className="material-symbols-outlined text-on-secondary text-sm leading-none">
                            camera_alt
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <p className="text-lg font-bold text-on-surface">{displayName}</p>
                        <div className="flex items-center gap-1 text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-base leading-none">
                            school
                          </span>
                          {classroom || "No classroom set"}
                        </div>
                        <div className="flex items-center gap-1 bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full w-fit">
                          <span className="material-symbols-outlined text-sm leading-none">
                            verified
                          </span>
                          Verified Teacher
                        </div>
                      </div>
                    </div>

                    {/* Classroom Name */}
                    <div className="mb-4">
                      <label
                        htmlFor="classroom"
                        className="block text-sm font-semibold text-on-surface-variant mb-1.5"
                      >
                        Classroom Name
                      </label>
                      <input
                        id="classroom"
                        type="text"
                        value={classroom}
                        onChange={(e) => setClassroom(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
                      />
                      {fieldError && <p className="text-xs text-error mt-1">{fieldError}</p>}
                    </div>

                    {/* About You */}
                    <div className="mb-4">
                      <label
                        htmlFor="bio"
                        className="block text-sm font-semibold text-on-surface-variant mb-1.5"
                      >
                        About You
                      </label>
                      <textarea
                        id="bio"
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell parents about your teaching style, experience, and what makes you great with kids..."
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors resize-none"
                      />
                    </div>

                    {/* Areas of Expertise */}
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-on-surface-variant mb-2">
                        Areas of Expertise
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_EXPERTISE.map((tag) => {
                          const isSelected = selectedExpertise.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => handleToggleExpertise(tag)}
                              className={`rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-primary text-on-primary"
                                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* API error */}
                    {error && (
                      <div className="flex items-center gap-2 bg-error-container/20 border border-error/20 rounded-xl px-4 py-3 mt-4">
                        <span className="material-symbols-outlined text-error text-[18px]">
                          error_outline
                        </span>
                        <p className="text-sm text-error">{error}</p>
                      </div>
                    )}

                    {/* Save button */}
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full mt-6 bg-gradient-to-br from-primary to-primary-container text-on-primary py-3.5 rounded-xl font-bold text-base shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      {saved ? "Saved!" : saving ? "Saving…" : "Save Profile"}
                    </button>
                  </div>
                </div>

                {/* Right — Availability + Tip */}
                <div className="lg:col-span-5">
                  <div className="sticky top-24">
                    {/* Availability card */}
                    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-base font-bold text-on-surface">My Availability</h2>
                        <button
                          onClick={addAvailabilityBlock}
                          aria-label="Add availability block"
                          className="text-primary hover:opacity-80 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-2xl leading-none">
                            add_circle
                          </span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-4">
                        {availability.map((block, idx) => (
                          <div
                            key={block.localId}
                            className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/15"
                          >
                            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                              Break Period {idx + 1}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                                  From
                                </label>
                                <input
                                  type="date"
                                  value={block.from}
                                  onChange={(e) =>
                                    updateBlockDate(block.localId, "from", e.target.value)
                                  }
                                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                                  To
                                </label>
                                <input
                                  type="date"
                                  value={block.to}
                                  onChange={(e) =>
                                    updateBlockDate(block.localId, "to", e.target.value)
                                  }
                                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeAvailabilityBlock(block.localId)}
                              className="text-xs text-outline hover:text-error mt-2 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}

                        {availability.length === 0 && (
                          <p className="text-sm text-on-surface-variant text-center py-4">
                            No availability added yet.
                          </p>
                        )}
                      </div>
                      {availabilityError && (
                        <p className="text-xs text-error mt-2">{availabilityError}</p>
                      )}
                    </div>

                    {/* Teacher&apos;s Tip */}
                    <div className="bg-primary-fixed/40 rounded-2xl p-4 border border-primary-fixed">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">
                          lightbulb
                        </span>
                        <div>
                          <p className="text-sm font-bold text-primary">Teacher&apos;s Tip</p>
                          <p className="text-sm text-on-surface-variant mt-0.5">
                            Teachers with complete profiles and clear availability get 3× more
                            booking requests.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
