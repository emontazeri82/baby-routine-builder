import Link from "next/link";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <nav
        aria-label="Settings sections"
        className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800"
      >
        <Link
          href="/dashboard/settings"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          Overview
        </Link>
      </nav>
      {children}
    </div>
  );
}
