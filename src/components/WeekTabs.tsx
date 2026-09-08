import Link from "next/link";
import { addDays, formatISODate, formatTRDate } from "@/lib/week";

/**
 * İçinde bulunulan hafta / gelecek hafta arasında geçiş için sekmeler.
 * Talep sayfalarında (`/talep`, `/yeni-ekip-talep`, `/antrenor-talep`,
 * `/panel`) kullanılır — bkz. [[getRequestableWeekStarts]].
 */
export default function WeekTabs({
  basePath,
  weeks,
  activeISO,
}: {
  basePath: string;
  weeks: { start: Date; label: string }[];
  activeISO: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {weeks.map((w) => {
        const iso = formatISODate(w.start);
        const active = iso === activeISO;
        const saturday = addDays(w.start, 5);
        return (
          <Link
            key={iso}
            href={`${basePath}?week=${iso}`}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition sm:text-sm ${
              active
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {w.label}
            <span className="ml-1.5 text-slate-400">
              {formatTRDate(w.start)} - {formatTRDate(saturday)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
