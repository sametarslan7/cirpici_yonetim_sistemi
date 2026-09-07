import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getUpcomingWeekStart,
  getWeekDates,
  formatISODate,
  formatTRDate,
  WEEKDAY_NAMES_TR,
} from "@/lib/week";
import { ANTRENOR_FIXED_SHIFT, SAGLIKCI_SHIFT_TIME } from "@/lib/constants";
import SaglikciExtraForm from "@/components/SaglikciExtraForm";
import StatusBanner from "@/components/StatusBanner";

const ROLE_LABEL: Record<"SAGLIKCI" | "ANTRENOR", string> = {
  SAGLIKCI: "Sağlık Ekibi",
  ANTRENOR: "Antrenör Ekibi (Sabit Program)",
};

export default async function PanelPage() {
  const session = await requireStaff();

  // Esnek antrenörler gün belirleme talebini /antrenor-talep sayfasından girer.
  if (session.role === "ANTRENOR" && !session.antrenorFixed) {
    redirect("/antrenor-talep");
  }

  let existing: { status: "PENDING" | "APPROVED" | "REJECTED"; rejectionReason: string | null } | null = null;
  let weekStartISO = "";
  let weekDayInfo: { index: number; label: string; dateLabel: string }[] = [];
  let initialExtraDays: boolean[] = [];

  if (session.role === "SAGLIKCI") {
    const weekStart = getUpcomingWeekStart();
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
    initialExtraDays = weekDates.slice(0, 5).map((d) => {
      const entry = req?.days.find((e) => formatISODate(e.date) === formatISODate(d));
      return entry?.shift === "EXTRA";
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
          Sabit Çalışma Programınız
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
          Bu program sabittir, gün belirleme talebi girmenize gerek yoktur.
        </p>
      </div>

      {session.role === "SAGLIKCI" && (
        <div className="mt-6 w-full text-left">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Ek Mesai Talebim
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Bu hafta içi bir gün 20:00&apos;a kadar kaldıysanız işaretleyip talep gönderin;
            Mahsum hocanın onayına gidecek ve aylık raporda ek mesai saati olarak görünecektir.
          </p>
          {existing && <StatusBanner status={existing.status} reason={existing.rejectionReason} />}
          <SaglikciExtraForm
            weekStartISO={weekStartISO}
            weekDates={weekDayInfo}
            initialExtraDays={initialExtraDays}
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
