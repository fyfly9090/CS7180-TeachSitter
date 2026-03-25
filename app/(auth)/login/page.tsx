"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "parent" | "teacher";

interface LoginFormState {
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
}

interface LoginApiResponse {
  session?: { access_token: string; expires_at: number };
  user?: { role: Role };
  error?: { code: string; message: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>({
    email: "",
    password: "",
    showPassword: false,
    loading: false,
    error: null,
  });

  function set<K extends keyof LoginFormState>(key: K, value: LoginFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    set("loading", true);
    set("error", null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data: LoginApiResponse = await res.json();

      if (!res.ok) {
        set("error", data.error?.message ?? "Invalid email or password.");
        set("loading", false);
        return;
      }

      // Role-based redirect: read role from session user metadata if available
      if (data.user?.role === "teacher") {
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20">

          {/* Logo */}
          <p className="font-serif italic font-bold text-2xl text-primary text-center">
            TeachSitter
          </p>

          {/* Title & subtitle */}
          <h1 className="text-3xl font-bold text-on-surface text-center mt-4">
            Welcome back
          </h1>
          <p className="text-sm text-on-surface-variant text-center mt-1 mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

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
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
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
              {form.loading ? "Signing in…" : "Sign In"}
            </button>

            {/* Sign up link */}
            <p className="text-center text-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-xs text-outline text-center mt-8">
          © 2026 TeachSitter ·{" "}
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </div>
  );
}
