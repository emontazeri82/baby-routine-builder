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
    <div className="min-h-screen flex flex-col">

      {/* 🔝 Top Navigation */}
      <header className="
        sticky top-0 z-50
        flex items-center justify-between
        px-6 h-16
        border-b
        bg-white/70 backdrop-blur-xl
        dark:bg-white/5 dark:border-white/10
      ">
        {/* Logo / Title */}
        <Link href="/" className="font-bold text-lg">
          Baby Routine
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-indigo-500 transition">
            Dashboard
          </Link>

          <Link
            href="/dashboard/settings"
            className="hover:text-indigo-500 transition"
          >
            Settings
          </Link>
        </nav>

        {/* User Info */}
        <div className="text-sm text-neutral-500">
          {session.user.email}
        </div>
      </header>

      {/* 📄 Page Content */}

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}