import Link from "next/link";
import type { RangeKey } from "@/lib/types";
import { RANGE_LABEL, RANGE_ORDER } from "@/lib/range";

export function DateRangeTabs({
  basePath,
  current,
}: {
  basePath: string;
  current: RangeKey;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white text-xs">
      {RANGE_ORDER.map((r) => {
        const active = r === current;
        return (
          <Link
            key={r}
            href={`${basePath}?range=${r}`}
            className={
              "px-3 py-1.5 transition " +
              (active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50")
            }
            scroll={false}
          >
            {RANGE_LABEL[r]}
          </Link>
        );
      })}
    </div>
  );
}
