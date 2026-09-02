import "server-only";
import { prisma } from "@/lib/prisma";
import { getWeekDates, formatISODate } from "@/lib/week";
import { getNewTeamWeekOffs, getMondayCompOffEmployeeId } from "@/lib/rotation";
import type { ShiftType } from "@prisma/client";

export type DayCell = {
  shift: ShiftType;
  time: string;
  isSaturday: boolean;
};

export type ScheduleRow = {
  employeeId: string;
  name: string;
  role: "VETERAN" | "NEW";
  requestStatus?: "PENDING" | "APPROVED" | "REJECTED" | "NONE";
  days: (DayCell | null)[]; // Pazartesi..Cumartesi, null = veri yok
};

/**
 * Bir haftanın tam çizelgesini kurar: eski ekibin ONAYLANMIŞ talepleri +
 * yeni ekibin sabit saatleri (rotasyonlu izin günüyle birlikte).
 * Sadece resmi/onaylı görünüm için kullanılır (herkese açık çizelge, PDF).
 */
export async function getApprovedWeekSchedule(weekStart: Date): Promise<ScheduleRow[]> {
  const weekDates = getWeekDates(weekStart);
  const dateKeys = weekDates.map(formatISODate);

  const veterans = await prisma.employee.findMany({
    where: { role: "VETERAN", active: true },
    orderBy: { rotationOrder: "asc" },
  });

  const approvedRequests = await prisma.weeklyRequest.findMany({
    where: { weekStart, status: "APPROVED" },
    include: { days: true },
  });
  const requestByEmployee = new Map(approvedRequests.map((r) => [r.employeeId, r]));

  const allRequestsThisWeek = await prisma.weeklyRequest.findMany({
    where: { weekStart },
    select: { employeeId: true, status: true },
  });
  const statusByEmployee = new Map(allRequestsThisWeek.map((r) => [r.employeeId, r.status]));

  // Cumartesi mesaisinin telafisi: bir önceki hafta onaylı Cumartesi çalışan
  // kişi varsa, bu haftanın Pazartesi'si o kişi için otomatik izinlidir —
  // kendisi henüz bu haftanın talebini göndermemiş/onaylanmamış olsa bile
  // çizelgede görünmesi gerekir.
  const mondayCompOffEmployeeId = await getMondayCompOffEmployeeId(weekStart);

  const veteranRows: ScheduleRow[] = veterans.map((emp) => {
    const req = requestByEmployee.get(emp.id);
    const days: (DayCell | null)[] = dateKeys.map((key) => {
      if (!req) return null;
      const entry = req.days.find((d) => formatISODate(d.date) === key);
      if (!entry) return null;
      return {
        shift: entry.shift,
        time: shiftTime(entry.shift),
        isSaturday: entry.isSaturday,
      };
    });
    if (emp.id === mondayCompOffEmployeeId) {
      days[0] = { shift: "OFF", time: shiftTime("OFF"), isSaturday: false };
    }
    return {
      employeeId: emp.id,
      name: emp.name,
      role: "VETERAN",
      requestStatus: (statusByEmployee.get(emp.id) as ScheduleRow["requestStatus"]) ?? "NONE",
      days,
    };
  });

  const newTeamOffs = await getNewTeamWeekOffs(weekStart);
  const newTeamRows: ScheduleRow[] = newTeamOffs.map(({ employee, dayOffIndex }) => {
    const days: (DayCell | null)[] = dateKeys.map((_, i) => {
      if (i === 5) {
        // Cumartesi - sabit
        return { shift: "NORMAL", time: "08:00 - 17:00", isSaturday: true };
      }
      if (i === dayOffIndex) {
        return { shift: "OFF", time: "—", isSaturday: false };
      }
      return { shift: "LATE", time: "11:00 - 20:00", isSaturday: false };
    });
    return {
      employeeId: employee.id,
      name: employee.name,
      role: "NEW",
      days,
    };
  });

  return [...veteranRows, ...newTeamRows];
}

/**
 * O haftanın hafta içi (Pzt-Cum) her günü için, başkası tarafından zaten
 * seçilmiş 11:00-20:00 (Geç Mesai) var mı diye bakar. Talep formunda o
 * seçeneği kilitlemek için kullanılır.
 */
export async function getLateConflictMap(
  weekStart: Date,
  excludeEmployeeId: string
): Promise<(string | null)[]> {
  const weekDates = getWeekDates(weekStart).slice(0, 5);
  const entries = await prisma.dayEntry.findMany({
    where: {
      date: { in: weekDates },
      shift: "LATE",
      isSaturday: false,
      weeklyRequest: {
        employeeId: { not: excludeEmployeeId },
        status: { in: ["PENDING", "APPROVED"] },
      },
    },
    include: { weeklyRequest: { include: { employee: true } } },
  });

  const byDate = new Map(
    entries.map((e) => [formatISODate(e.date), e.weeklyRequest.employee.name])
  );
  return weekDates.map((d) => byDate.get(formatISODate(d)) ?? null);
}

function shiftTime(shift: ShiftType): string {
  switch (shift) {
    case "NORMAL":
      return "08:00 - 17:00";
    case "LATE":
      return "11:00 - 20:00";
    case "EXTRA":
      return "08:00 - 20:00";
    case "OFF":
    default:
      return "—";
  }
}
