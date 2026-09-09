import { requireNewTeam } from "@/lib/session";
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
import { suggestNewTeamDayOffIndex } from "@/lib/rotation";
import { NEW_TEAM_SHIFT, NEW_TEAM_SATURDAY_SHIFT } from "@/lib/constants";
import NewTeamDayOffForm from "@/components/NewTeamDayOffForm";
import WeekTabs from "@/components/WeekTabs";

export default async function YeniEkipTalepPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireNewTeam();
  const params = await searchParams;
  const seasonWeeks = getSeasonWeekStarts();
  const upcomingWeekStart = getUpcomingWeekStart();
  const matchedWeekStart = params.week
    ? seasonWeeks.find((d) => formatISODate(d) === params.week)
    : undefined;
  const weekStart = matchedWeekStart ?? upcomingWeekStart;
  const weekDates = getWeekDates(weekStart);

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  const override = await prisma.newTeamWeekOff.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
  });

  const initialDayOffIndex =
    override?.dayOffIndex ?? suggestNewTeamDayOffIndex(weekStart, employee?.rotationOrder ?? 1);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Haftalık İzin Günüm</h1>
        <p className="mt-1 text-sm text-slate-500">
          Normalde hafta içi (Pazartesi-Cuma) {NEW_TEAM_SHIFT.time} ve Cumartesi{" "}
          {NEW_TEAM_SATURDAY_SHIFT.time} çalışırsınız; hafta içinden bir gün izinli olursunuz.{" "}
          {formatTRDate(weekStart)} - {formatTRDate(weekDates[5])} haftası için hangi gün izinli
          olmak istediğinizi aşağıdan seçip kaydedin. Bu kayıt onay gerektirmez, hemen geçerli
          olur.
        </p>
      </div>

      <WeekTabs
        basePath="/yeni-ekip-talep"
        weeks={getSeasonWeekTabs()}
        activeISO={formatISODate(weekStart)}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <NewTeamDayOffForm
          weekStartISO={formatISODate(weekStart)}
          weekDates={weekDates.slice(0, 5).map((d, i) => ({
            index: i,
            label: WEEKDAY_NAMES_TR[i],
            dateLabel: formatTRDate(d),
          }))}
          initialDayOffIndex={initialDayOffIndex}
          isOverridden={Boolean(override)}
        />
      </div>
    </div>
  );
}
