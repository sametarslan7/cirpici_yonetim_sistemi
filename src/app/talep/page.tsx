import { requireVeteran } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUpcomingWeekStart, getWeekDates, formatISODate, formatTRDate, WEEKDAY_NAMES_TR } from "@/lib/week";
import { suggestSaturdayEmployeeId, getSaturdayTakenBy } from "@/lib/rotation";
import { getLateConflictMap } from "@/lib/schedule";
import RequestForm from "@/components/RequestForm";
import type { ShiftType } from "@prisma/client";

export default async function TalepPage() {
  const session = await requireVeteran();
  const weekStart = getUpcomingWeekStart();
  const weekDates = getWeekDates(weekStart);

  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
    include: { days: true },
  });

  const initialShifts: ShiftType[] = weekDates.slice(0, 5).map((d) => {
    const entry = existing?.days.find(
      (e) => !e.isSaturday && formatISODate(e.date) === formatISODate(d)
    );
    return entry?.shift ?? "NORMAL";
  });

  const [suggestedId, takenBy, lateConflicts] = await Promise.all([
    suggestSaturdayEmployeeId(weekStart),
    getSaturdayTakenBy(weekStart),
    getLateConflictMap(weekStart, session.employeeId),
  ]);

  const saturdayLockedByOther =
    takenBy && takenBy.employeeId !== session.employeeId ? takenBy.employee.name : null;

  const initialWorkingSaturday =
    existing?.workingSaturday ?? (!saturdayLockedByOther && suggestedId === session.employeeId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Haftalık Mesai Talebim</h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatTRDate(weekStart)} - {formatTRDate(weekDates[5])} haftası için talebinizi
          girin. Bu talep Mahsum hocanın onayına gidecektir.
        </p>
      </div>

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
        isSuggestedForSaturday={suggestedId === session.employeeId}
        lateConflicts={lateConflicts}
        locked={existing?.status === "APPROVED"}
      />
    </div>
  );
}

function StatusBanner({
  status,
  reason,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
}) {
  const map = {
    PENDING: { text: "Talebiniz onay bekliyor.", classes: "bg-amber-50 text-amber-800 border-amber-200" },
    APPROVED: { text: "Talebiniz onaylandı ✅", classes: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    REJECTED: {
      text: `Talebiniz reddedildi. Sebep: ${reason || "belirtilmedi"}. Lütfen düzenleyip tekrar gönderin.`,
      classes: "bg-rose-50 text-rose-800 border-rose-200",
    },
  } as const;
  const info = map[status];
  return (
    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${info.classes}`}>{info.text}</div>
  );
}
