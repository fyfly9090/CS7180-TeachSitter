"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "parent" | "teacher";

interface SignupFormState {
  name: string;
  email: string;
  password: string;
  role: Role | null;
  agreed: boolean;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
}

interface SignupApiResponse {
  user?: { id: string; email: string; role: Role };
  error?: { code: string; message: string };
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>({
    name: "",
    email: "",
    password: "",
    role: null,
    agreed: false,
    showPassword: false,
    loading: false,
    error: null,
  });

  function set<K extends keyof SignupFormState>(key: K, value: SignupFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.role) {
      set("error", "Please select whether you are a parent or teacher.");
      return;
    }
    if (!form.agreed) {
      set("error", "Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    set("loading", true);
    set("error", null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });

      const data: SignupApiResponse = await res.json();

      if (!res.ok) {
        set("error", data.error?.message ?? "Signup failed. Please try again.");
        set("loading", false);
        return;
      }

      if (form.role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      set("error", "Network error. Please check your connection and try again.");
      set("loading", false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12 items-start">

          {/* ── Left column: editorial / branding ── */}
          <div className="lg:col-span-5 relative">
            {/* Logo */}
            <p className="font-serif italic font-bold text-2xl text-primary mb-8">
              TeachSitter
            </p>

            {/* Headline */}
            <h1 className="font-serif italic text-5xl font-bold text-on-surface leading-tight mb-6">
              Childcare from teachers they already love.
            </h1>

            {/* Subtext */}
            <p className="text-on-surface-variant text-base leading-relaxed mb-12">
              Connect with your child&apos;s own preschool teacher for trusted care during school breaks.
            </p>

            {/* Decorative blockquote card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xl p-6 border border-outline-variant/20">
              <span className="material-symbols-outlined text-secondary text-3xl mb-4 block">
                format_quote
              </span>
              <p className="text-on-surface text-sm leading-relaxed italic mb-4">
                &ldquo;My daughter was thrilled — she went with Ms. Tara, her very own teacher!&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">
                    person
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-medium">
                  Parent, Sunflower Class
                </p>
              </div>
            </div>
          </div>

          {/* ── Right column: form card ── */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20">

              {/* Card header */}
              <h2 className="text-2xl font-bold text-on-surface mb-1">
                Create your account
              </h2>
              <p className="text-sm text-on-surface-variant mb-6">
                Join TeachSitter to connect with trusted teachers.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">

                {/* Role selection */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                    I am a...
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Parent card */}
                    <button
                      type="button"
                      onClick={() => set("role", "parent")}
                      className={[
                        "rounded-xl p-4 cursor-pointer transition-all duration-200 text-left",
                        form.role === "parent"
                          ? "border-2 border-primary bg-primary-fixed/30"
                          : "border border-outline-variant/20 bg-surface-container-low",
                      ].join(" ")}
                    >
                      <span className="material-symbols-outlined text-primary text-2xl block mb-2">
                        family_history
                      </span>
                      <p className="font-semibold text-on-surface text-sm">Parent</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Book trusted care</p>
                    </button>

                    {/* Teacher card */}
                    <button
                      type="button"
                      onClick={() => set("role", "teacher")}
                      className={[
                        "rounded-xl p-4 cursor-pointer transition-all duration-200 text-left",
                        form.role === "teacher"
                          ? "border-2 border-primary bg-primary-fixed/30"
                          : "border border-outline-variant/20 bg-surface-container-low",
                      ].join(" ")}
                    >
                      <span className="material-symbols-outlined text-primary text-2xl block mb-2">
                        school
                      </span>
                      <p className="font-semibold text-on-surface text-sm">Teacher</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Share your time</p>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-semibold text-on-surface-variant mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                      person
                    </span>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-lg focus:ring-2 focus:ring-primary-fixed-dim focus:border-primary transition-all text-on-surface placeholder:text-outline text-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-on-surface-variant mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                      email
                    </span>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-lg focus:ring-2 focus:ring-primary-fixed-dim focus:border-primary transition-all text-on-surface placeholder:text-outline text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-on-surface-variant mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password"
                      type={form.showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-lg focus:ring-2 focus:ring-primary-fixed-dim focus:border-primary transition-all text-on-surface placeholder:text-outline text-sm"
                    />
                    <button
                      type="button"
                      aria-label={form.showPassword ? "Hide password" : "Show password"}
                      onClick={() => set("showPassword", !form.showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {form.showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => set("agreed", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-outline-variant accent-primary cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-on-surface-variant leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                {/* Error message */}
                {form.error && (
                  <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3">
                    <span className="material-symbols-outlined text-error text-lg mt-0.5 shrink-0">
                      error
                    </span>
                    <p className="text-sm text-error">{form.error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={form.loading}
                  className="w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl font-bold text-base shadow-md hover:opacity-90 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {form.loading ? "Creating account…" : "Create Account"}
                </button>

                {/* Sign in link */}
                <p className="text-center text-sm text-on-surface-variant">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 pb-8 mt-4">
        <p className="text-xs text-outline text-center">
          © 2026 TeachSitter ·{" "}
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
