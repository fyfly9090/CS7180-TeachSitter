"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function TeacherNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

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
          <button
            onClick={handleSignOut}
            className="text-sm font-semibold text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

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

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TeacherNavbar />
      <MobileBottomNav />
      {children}
    </>
  );
}
