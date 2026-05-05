import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
