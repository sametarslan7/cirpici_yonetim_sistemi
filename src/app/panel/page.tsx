import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
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
import { getSaturdayTakenBy } from "@/lib/rotation";
import { getLateConflictMap } from "@/lib/schedule";
import { ANTRENOR_FIXED_SHIFT, SAGLIKCI_SHIFT_TIME } from "@/lib/constants";
import SaglikciRequestForm from "@/components/SaglikciRequestForm";
import StatusBanner from "@/components/StatusBanner";
import WeekTabs from "@/components/WeekTabs";
import type { ShiftType } from "@prisma/client";

const ROLE_LABEL: Record<"SAGLIKCI" | "ANTRENOR", string> = {
  SAGLIKCI: "Sağlık Ekibi",
  ANTRENOR: "Antrenör Ekibi (Sabit Program)",
};

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireStaff();

  // Esnek antrenörler gün belirleme talebini /antrenor-talep sayfasından girer.
  if (session.role === "ANTRENOR" && !session.antrenorFixed) {
    redirect("/antrenor-talep");
  }

  let existing: { status: "PENDING" | "APPROVED" | "REJECTED"; rejectionReason: string | null } | null = null;
  let weekStartISO = "";
  let weekDayInfo: { index: number; label: string; dateLabel: string }[] = [];
  let initialShifts: ShiftType[] = [];
  let initialWorkingSaturday = false;
  let initialOffDayIndex: number | null = null;
  let saturdayLockedByOther: string | null = null;
  let lateConflicts: (string | null)[] = [];
  let weekTabs: { start: Date; label: string }[] = [];

  if (session.role === "SAGLIKCI") {
    const params = await searchParams;
    const seasonWeeks = getSeasonWeekStarts();
    const upcomingWeekStart = getUpcomingWeekStart();
    const matchedWeekStart = params.week
      ? seasonWeeks.find((d) => formatISODate(d) === params.week)
      : undefined;
    const weekStart = matchedWeekStart ?? upcomingWeekStart;
    weekTabs = getSeasonWeekTabs();
    const weekDates = getWeekDates(weekStart);
    weekStartISO = formatISODate(weekStart);
    weekDayInfo = weekDates.slice(0, 5).map((d, i) => ({
      index: i,
      label: WEEKDAY_NAMES_TR[i],
      dateLabel: formatTRDate(d),
    }));

    const req = await prisma.weeklyRequest.findUnique({
      where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
      include: { days: true },
    });
    existing = req ? { status: req.status, rejectionReason: req.rejectionReason } : null;

    const [takenBy, conflicts] = await Promise.all([
      getSaturdayTakenBy(weekStart, "SAGLIKCI"),
      getLateConflictMap(weekStart, session.employeeId, "SAGLIKCI"),
    ]);
    saturdayLockedByOther =
      takenBy && takenBy.employeeId !== session.employeeId ? takenBy.employee.name : null;
    lateConflicts = conflicts;

    initialWorkingSaturday = req?.workingSaturday ?? false;
    const offEntry = req?.days.find((d) => !d.isSaturday && d.shift === "OFF");
    const offEntryIndex = offEntry
      ? weekDates.slice(0, 5).findIndex((d) => formatISODate(d) === formatISODate(offEntry.date))
      : -1;
    initialOffDayIndex = offEntryIndex >= 0 ? offEntryIndex : null;

    initialShifts = weekDates.slice(0, 5).map((d, i) => {
      if (i === initialOffDayIndex) return "OFF";
      const entry = req?.days.find(
        (e) => !e.isSaturday && formatISODate(e.date) === formatISODate(d)
      );
      return entry?.shift ?? "NORMAL";
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
        {session.name.charAt(0)}
      </span>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">
        Hoş geldiniz, {session.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{ROLE_LABEL[session.role]}</p>

      <div className="mt-6 w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Varsayılan Çalışma Programınız
        </p>
        {session.role === "ANTRENOR" ? (
          <ul className="space-y-1.5 text-sm text-slate-700">
            <li>
              <span className="font-medium">Pazartesi:</span> İzinli
            </li>
            <li>
              <span className="font-medium">Salı - Cuma:</span>{" "}
              {ANTRENOR_FIXED_SHIFT.weekdayTime}
            </li>
            <li>
              <span className="font-medium">Cumartesi:</span>{" "}
              {ANTRENOR_FIXED_SHIFT.saturdayTime}
            </li>
          </ul>
        ) : (
          <ul className="space-y-1.5 text-sm text-slate-700">
            <li>
              <span className="font-medium">Pazartesi - Cuma:</span> {SAGLIKCI_SHIFT_TIME}
            </li>
            <li>
              <span className="font-medium">Cumartesi - Pazar:</span> İzinli
            </li>
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          {session.role === "ANTRENOR"
            ? "Bu program sabittir, gün belirleme talebi girmenize gerek yoktur."
            : "Farklı bir saat aralığı, ek mesai ya da Cumartesi çalışmak isterseniz aşağıdan talep gönderebilirsiniz."}
        </p>
      </div>

      {session.role === "SAGLIKCI" && (
        <div className="mt-6 w-full text-left">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Haftalık Talebim
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Bazen hafta içi bir gün izin kullanmanız gerekebilir; bu durumda karşılığında
            Cumartesi çalışabilirsiniz. Ayrıca bir gün farklı saatte (11:00-20:00) çalışacaksanız
            ya da 20:00&apos;a kadar ek mesai yapacaksanız aşağıdan işaretleyip talep gönderin.
            Mahsum hocanın onayına gidecek ve aylık raporda görünecektir.
          </p>
          <WeekTabs basePath="/panel" weeks={weekTabs} activeISO={weekStartISO} />
          {existing && <StatusBanner status={existing.status} reason={existing.rejectionReason} />}
          <SaglikciRequestForm
            weekStartISO={weekStartISO}
            weekDates={weekDayInfo}
            initialShifts={initialShifts}
            initialWorkingSaturday={initialWorkingSaturday}
            initialOffDayIndex={initialOffDayIndex}
            saturdayLockedByOther={saturdayLockedByOther}
            lateConflicts={lateConflicts}
            locked={existing?.status === "APPROVED"}
          />
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500">
        Haftalık çizelgeyi{" "}
        <Link href="/cizelge" className="text-teal-600 underline">
          buradan
        </Link>{" "}
        görüntüleyebilirsiniz.
      </p>
    </div>
  );
}
