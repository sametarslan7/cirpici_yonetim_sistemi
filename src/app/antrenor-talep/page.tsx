import { requireFlexibleAntrenor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getRequestableWeekStarts,
  getWeekDates,
  formatISODate,
  formatTRDate,
  WEEKDAY_NAMES_TR,
} from "@/lib/week";
import { getSaturdayTakenBy } from "@/lib/rotation";
import AntrenorRequestForm from "@/components/AntrenorRequestForm";
import StatusBanner from "@/components/StatusBanner";
import WeekTabs from "@/components/WeekTabs";

export default async function AntrenorTalepPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireFlexibleAntrenor();
  const params = await searchParams;
  const [currentWeekStart, upcomingWeekStart] = getRequestableWeekStarts();
  const weekStart =
    params.week === formatISODate(currentWeekStart) ? currentWeekStart : upcomingWeekStart;
  const weekDates = getWeekDates(weekStart);

  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
    include: { days: true },
  });

  const takenBy = await getSaturdayTakenBy(weekStart, "ANTRENOR");
  const saturdayLockedByOther =
    takenBy && takenBy.employeeId !== session.employeeId ? takenBy.employee.name : null;

  const initialWorkingSaturday = existing?.workingSaturday ?? false;
  const offEntry = existing?.days.find((d) => !d.isSaturday && d.shift === "OFF");
  const offEntryIndex = offEntry
    ? weekDates.slice(0, 5).findIndex((d) => formatISODate(d) === formatISODate(offEntry.date))
    : -1;
  const initialOffDayIndex = offEntryIndex >= 0 ? offEntryIndex : null;

  const initialExtraDays = weekDates.slice(0, 5).map((d) => {
    const entry = existing?.days.find(
      (e) => !e.isSaturday && formatISODate(e.date) === formatISODate(d)
    );
    return entry?.shift === "EXTRA";
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Haftalık Talebim</h1>
        <p className="mt-1 text-sm text-slate-500">
          Normalde hafta içi (Pazartesi-Cuma) 08:00-17:00 çalışırsınız. {formatTRDate(weekStart)}{" "}
          - {formatTRDate(weekDates[5])} haftası için Cumartesi çalışmak veya bir gün 20:00&apos;a
          kadar ek mesai yapmak isterseniz aşağıdan işaretleyip talep gönderin. Bu talep Mahsum
          hocanın onayına gidecektir.
        </p>
      </div>

      <WeekTabs
        basePath="/antrenor-talep"
        weeks={[
          { start: currentWeekStart, label: "Bu Hafta" },
          { start: upcomingWeekStart, label: "Gelecek Hafta" },
        ]}
        activeISO={formatISODate(weekStart)}
      />

      {existing && <StatusBanner status={existing.status} reason={existing.rejectionReason} />}

      <AntrenorRequestForm
        weekStartISO={formatISODate(weekStart)}
        weekDates={weekDates.slice(0, 5).map((d, i) => ({
          index: i,
          label: WEEKDAY_NAMES_TR[i],
          dateLabel: formatTRDate(d),
        }))}
        initialWorkingSaturday={initialWorkingSaturday}
        initialOffDayIndex={initialOffDayIndex}
        initialExtraDays={initialExtraDays}
        saturdayLockedByOther={saturdayLockedByOther}
        locked={existing?.status === "APPROVED"}
      />
    </div>
  );
}
