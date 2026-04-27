import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">

      {/* 🔝 Top Navigation */}
      <header
        className="
          sticky top-0 z-50
          flex items-center justify-between
          px-6 h-16
          border-b
          bg-white/70 backdrop-blur-xl
          dark:bg-white/5 dark:border-white/10
        "
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-bold text-lg bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent"
        >
          Baby Routine
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/dashboard"
            className="hover:text-indigo-500 transition"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/babies"
            className="hover:text-indigo-500 transition"
          >
            Babies
          </Link>

          <Link
            href="/dashboard/settings"
            className="hover:text-indigo-500 transition"
          >
            Settings
          </Link>
        </nav>

        {/* User */}
        <div className="text-sm text-neutral-500 hidden sm:block">
          {session.user.email}
        </div>
      </header>

      {/* 📄 Content */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto">

          {/* 🔥 Suspense fallback FIX */}
          <Suspense
            fallback={
              <div className="text-sm text-neutral-500 animate-pulse">
                Loading dashboard...
              </div>
            }
          >
            {children}
          </Suspense>

        </div>
      </main>
    </div>
  );
}