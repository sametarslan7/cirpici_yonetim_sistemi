import { requireFlexibleAntrenor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUpcomingWeekStart, getWeekDates, formatISODate, formatTRDate } from "@/lib/week";
import { getSaturdayTakenBy } from "@/lib/rotation";
import AntrenorRequestForm from "@/components/AntrenorRequestForm";
import StatusBanner from "@/components/StatusBanner";

export default async function AntrenorTalepPage() {
  const session = await requireFlexibleAntrenor();
  const weekStart = getUpcomingWeekStart();
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Haftalık Cumartesi Talebim</h1>
        <p className="mt-1 text-sm text-slate-500">
          Normalde hafta içi (Pazartesi-Cuma) 08:00-17:00 çalışırsınız. {formatTRDate(weekStart)}{" "}
          - {formatTRDate(weekDates[5])} haftası için Cumartesi çalışmak isterseniz, karşılığında
          kullanacağınız izin gününü seçip talep gönderin. Bu talep Mahsum hocanın onayına
          gidecektir.
        </p>
      </div>

      {existing && <StatusBanner status={existing.status} reason={existing.rejectionReason} />}

      <AntrenorRequestForm
        weekStartISO={formatISODate(weekStart)}
        initialWorkingSaturday={initialWorkingSaturday}
        initialOffDayIndex={initialOffDayIndex}
        saturdayLockedByOther={saturdayLockedByOther}
        locked={existing?.status === "APPROVED"}
      />
    </div>
  );
}
