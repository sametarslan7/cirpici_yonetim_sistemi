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
import {
  getSaturdayTakenBy,
  getMondayCompOffEmployeeId,
} from "@/lib/rotation";
import { getLateConflictMap } from "@/lib/schedule";
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

  const [takenBy, lateConflicts, mondayCompOffEmployeeId] = await Promise.all([
    getSaturdayTakenBy(weekStart, "VETERAN"),
    getLateConflictMap(weekStart, session.employeeId, "VETERAN"),
    getMondayCompOffEmployeeId(weekStart),
  ]);

  const mondayCompOffLocked = mondayCompOffEmployeeId === session.employeeId;

  const initialShifts: ShiftType[] = weekDates.slice(0, 5).map((d, i) => {
    if (i === 0 && mondayCompOffLocked) return "OFF";
    const entry = existing?.days.find(
      (e) => !e.isSaturday && formatISODate(e.date) === formatISODate(d)
    );
    return entry?.shift ?? "NORMAL";
  });

  const saturdayLockedByOther =
    takenBy && takenBy.employeeId !== session.employeeId ? takenBy.employee.name : null;

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
        weekStartISO={formatISODate(weekStart)}
        weekDates={weekDates.slice(0, 5).map((d, i) => ({
          index: i,
          label: WEEKDAY_NAMES_TR[i],
          dateLabel: formatTRDate(d),
        }))}
        initialShifts={initialShifts}
        initialWorkingSaturday={initialWorkingSaturday}
        saturdayLockedByOther={saturdayLockedByOther}
        lateConflicts={lateConflicts}
        locked={existing?.status === "APPROVED"}
        mondayCompOffLocked={mondayCompOffLocked}
      />
    </div>
  );
}
