import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    <div className="min-h-screen flex bg-neutral-100">

      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r hidden md:flex flex-col p-6">
        <h2 className="text-xl font-semibold mb-8">
          Baby Routine
        </h2>

        <nav className="space-y-4 text-sm">
          <Link href="/dashboard" className="block hover:font-medium">
            Dashboard
          </Link>

          <Link href="/dashboard/babies" className="block hover:font-medium">
            Babies
          </Link>

          <Link href="/dashboard/activities" className="block hover:font-medium">
            Activity
          </Link>

          <Link href="/dashboard/reminders" className="block hover:font-medium">
            Reminders
          </Link>

          <Link href="/dashboard/settings" className="block hover:font-medium">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Content Wrapper */}
      <div className="flex-1 min-h-0 flex flex-col">

        {/* Top Bar */}
        <header className="h-16 shrink-0 bg-white border-b px-6 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Welcome back 👋
          </span>

          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-red-500 hover:underline">
              Logout
            </button>
          </form>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-auto p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
