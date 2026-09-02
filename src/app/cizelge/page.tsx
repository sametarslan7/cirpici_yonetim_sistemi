import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  getMonday,
  parseISODate,
  formatISODate,
  addDays,
  formatTRDate,
} from "@/lib/week";
import { getApprovedWeekSchedule } from "@/lib/schedule";
import ScheduleTable from "@/components/ScheduleTable";
import PdfButton from "@/components/PdfButton";
import { SHIFT_META } from "@/lib/constants";

export default async function CizelgePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const weekStart = params.week ? getMonday(parseISODate(params.week)) : getMonday(new Date());
  const weekDates = [0, 1, 2, 3, 4, 5].map((i) => addDays(weekStart, i));
  const rows = await getApprovedWeekSchedule(weekStart);

  const prevWeek = formatISODate(addDays(weekStart, -7));
  const nextWeek = formatISODate(addDays(weekStart, 7));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Haftalık Çizelge</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatTRDate(weekStart)} - {formatTRDate(weekDates[5])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/cizelge?week=${prevWeek}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Önceki Hafta
          </Link>
          <Link
            href={`/cizelge?week=${nextWeek}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sonraki Hafta →
          </Link>
          <PdfButton weekStart={weekStart} />
        </div>
      </div>

      <Legend />

      <ScheduleTable rows={rows} weekDates={weekDates} />

      <p className="mt-3 text-xs text-slate-400">Not: Pazar günleri tüm ekip izinlidir.</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {(["NORMAL", "LATE", "EXTRA", "OFF"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`h-2.5 w-2.5 rounded-full ${SHIFT_META[s].dot}`} />
          {SHIFT_META[s].label} ({SHIFT_META[s].time})
        </span>
      ))}
    </div>
  );
}
