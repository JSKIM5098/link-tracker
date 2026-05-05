import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-slate-900"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
              LT
            </span>
            <span>Link Tracker</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              대시보드
            </Link>
            <Link
              href="/dashboard/new"
              className="rounded-md bg-brand-500 px-3 py-1.5 font-medium text-white hover:bg-brand-600"
            >
              + 새 캠페인
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
