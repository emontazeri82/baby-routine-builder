import Link from "next/link";
import PageTransition from "@/components/dashboard/PageTransition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sky-50 via-white to-indigo-50">

      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white/70 backdrop-blur-xl border-r border-neutral-200 hidden md:flex flex-col p-6 shadow-sm">
        
        <h2 className="text-xl font-semibold mb-10 tracking-tight">
          Baby Routine
        </h2>

        <nav className="space-y-3 text-sm">
          <NavItem href="/dashboard">Dashboard</NavItem>
          <NavItem href="/dashboard/babies">Babies</NavItem>
          <NavItem href="/dashboard/activities">Activity</NavItem>
          <NavItem href="/dashboard/reminders">Reminders</NavItem>
          <NavItem href="/dashboard/settings">Settings</NavItem>
        </nav>

      </aside>

      {/* Content Wrapper */}
      <div className="flex-1 min-h-0 flex flex-col">

        {/* Top Bar */}
        <header className="h-16 shrink-0 bg-white/70 backdrop-blur-xl border-b border-neutral-200 px-8 flex items-center justify-between shadow-sm">
          <span className="text-sm text-neutral-500">
            Welcome back 👋
          </span>

          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-red-500 hover:text-red-600 transition">
              Logout
            </button>
          </form>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-auto p-10">
          <PageTransition>{children}</PageTransition>
        </main>

      </div>
    </div>
  );
}

/* ---------- Nav Item Component ---------- */

function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 rounded-lg text-neutral-600 hover:bg-sky-100 hover:text-sky-700 transition-all duration-200"
    >
      {children}
    </Link>
  );
}
