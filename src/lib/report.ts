import "server-only";
import { prisma } from "@/lib/prisma";

export type MonthlyExtraRow = {
  employeeId: string;
  name: string;
  extraShiftCount: number;
  saturdayCount: number;
};

/**
 * Ay sonu mesai ücreti hesaplaması için: her eski ekip elemanının o ay
 * kaç kere 08:00-20:00 (3 saat ekstra mesai) yaptığını ve kaç Cumartesi
 * çalıştığını sayar. Sadece ONAYLANMIŞ kayıtlar sayılır.
 */
export async function getMonthlyExtraShiftReport(year: number, month: number): Promise<MonthlyExtraRow[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const veterans = await prisma.employee.findMany({
    where: { role: "VETERAN", active: true },
    orderBy: { rotationOrder: "asc" },
  });

  const entries = await prisma.dayEntry.findMany({
    where: {
      date: { gte: start, lt: end },
      weeklyRequest: { status: "APPROVED" },
    },
    include: { weeklyRequest: true },
  });

  return veterans.map((emp) => {
    const empEntries = entries.filter((e) => e.weeklyRequest.employeeId === emp.id);
    return {
      employeeId: emp.id,
      name: emp.name,
      extraShiftCount: empEntries.filter((e) => e.shift === "EXTRA" && !e.isSaturday).length,
      saturdayCount: empEntries.filter((e) => e.isSaturday).length,
    };
  });
}
