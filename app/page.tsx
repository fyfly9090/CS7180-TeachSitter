import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-surface-container-lowest/85 backdrop-blur-md border-b border-outline-variant/20 z-50 flex items-center">
        <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between">
          <span className="font-serif italic font-bold text-2xl text-primary">TeachSitter</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <h1 className="font-serif italic text-5xl md:text-6xl font-bold text-on-surface tracking-tight max-w-3xl leading-tight">
          Childcare from teachers they already love.
        </h1>
        <p className="mt-6 text-lg text-on-surface-variant max-w-xl leading-relaxed">
          TeachSitter connects preschool families with their school&apos;s teachers for trusted,
          familiar childcare during school breaks.
        </p>

        <div className="flex gap-4 mt-10">
          <Link
            href="/signup"
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-bold text-base shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="border border-outline-variant/30 text-on-surface-variant px-8 py-4 rounded-xl font-bold text-base hover:bg-surface-container transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
          <span className="material-symbols-outlined text-3xl text-primary mb-3">school</span>
          <h3 className="font-bold text-on-surface text-lg">Familiar Faces</h3>
          <p className="text-sm text-on-surface-variant mt-2">
            Your child&apos;s own teachers — people they already know and trust.
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
          <span className="material-symbols-outlined text-3xl text-secondary mb-3">
            calendar_month
          </span>
          <h3 className="font-bold text-on-surface text-lg">Break Coverage</h3>
          <p className="text-sm text-on-surface-variant mt-2">
            Winter, spring, summer, Thanksgiving — coverage when school is closed.
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
          <span className="material-symbols-outlined text-3xl text-tertiary mb-3">smart_toy</span>
          <h3 className="font-bold text-on-surface text-lg">AI-Powered Matching</h3>
          <p className="text-sm text-on-surface-variant mt-2">
            Smart ranking by classroom familiarity, availability, and profile fit.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant/20 py-6 text-center">
        <p className="text-xs text-outline">
          © 2026 TeachSitter ·{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </p>
      </footer>
    </main>
  );
}
