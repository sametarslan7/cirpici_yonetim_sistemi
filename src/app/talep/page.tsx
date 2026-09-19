import { requireVeteran } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getSeasonWeekStarts,
  getSeasonWeekTabs,
  getUpcomingWeekStart,
  getWeekDates,
  formatISODate,
  formatTRDate,
  WEEKDAY_NAMES_TR,
} from "@/lib/week";
import { getLateConflictMap } from "@/lib/schedule";
import { isLastVeteranToSubmit } from "@/lib/rotation";
import RequestForm from "@/components/RequestForm";
import StatusBanner from "@/components/StatusBanner";
import WeekTabs from "@/components/WeekTabs";
import type { ShiftType } from "@prisma/client";

export default async function TalepPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireVeteran();
  const params = await searchParams;
  const seasonWeeks = getSeasonWeekStarts();
  const upcomingWeekStart = getUpcomingWeekStart();
  const matchedWeekStart = params.week
    ? seasonWeeks.find((d) => formatISODate(d) === params.week)
    : undefined;
  const weekStart = matchedWeekStart ?? upcomingWeekStart;
  const weekDates = getWeekDates(weekStart);

  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
    include: { days: true },
  });

  const lateConflicts = await getLateConflictMap(weekStart, session.employeeId, "VETERAN");
  const isLastToSubmit = await isLastVeteranToSubmit(weekStart, session.employeeId);

  const initialShifts: ShiftType[] = weekDates.slice(0, 5).map((d) => {
    const entry = existing?.days.find(
      (e) => !e.isSaturday && formatISODate(e.date) === formatISODate(d)
    );
    return entry?.shift ?? "NORMAL";
  });

  const existingDayOffIndex = initialShifts.findIndex((s) => s === "OFF");
  const initialDayOffIndex = existingDayOffIndex === -1 ? 0 : existingDayOffIndex;

  const initialWorkingSaturday = existing?.workingSaturday ?? false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Haftalık Mesai Talebim</h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatTRDate(weekStart)} - {formatTRDate(weekDates[5])} haftası için talebinizi
          girin. Bu talep Mahsum hocanın onayına gidecektir.
        </p>
      </div>

      <WeekTabs
        basePath="/talep"
        weeks={getSeasonWeekTabs()}
        activeISO={formatISODate(weekStart)}
      />

      {existing && (
        <StatusBanner status={existing.status} reason={existing.rejectionReason} />
      )}

      <RequestForm
        key={formatISODate(weekStart)}
        weekStartISO={formatISODate(weekStart)}
        weekDates={weekDates.slice(0, 5).map((d, i) => ({
          index: i,
          label: WEEKDAY_NAMES_TR[i],
          dateLabel: formatTRDate(d),
        }))}
        initialShifts={initialShifts}
        initialWorkingSaturday={initialWorkingSaturday}
        initialDayOffIndex={initialDayOffIndex}
        lateConflicts={lateConflicts}
        isLastToSubmit={isLastToSubmit}
        locked={existing?.status === "PENDING" || existing?.status === "APPROVED"}
      />
    </div>
  );
}
