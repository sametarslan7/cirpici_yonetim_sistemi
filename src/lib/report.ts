import "server-only";
import { prisma } from "@/lib/prisma";

export type MonthlyExtraRow = {
  employeeId: string;
  name: string;
  role: "VETERAN" | "ANTRENOR" | "SAGLIKCI";
  extraShiftCount: number;
  // Sadece eski ekip için anlamlı: Cumartesi onlar için gerçek bir ek gün
  // (5 gün hafta içi + Cumartesi). Antrenörde Cumartesi karşılığında aynı
  // hafta içinden bir gün izin kullanıldığı için ek mesai sayılmaz, bu
  // yüzden antrenör/sağlıkçı satırlarında her zaman 0'dır.
  saturdayCount: number;
};

/**
 * Ay sonu mesai ücreti hesaplaması için: eski ekip, antrenör ve sağlık
 * ekibinden her çalışanın o ay kaç kere 08:00-20:00 (3 saat ekstra mesai)
 * yaptığını sayar. Eski ekip için ayrıca kaç Cumartesi çalıştığı da
 * sayılır. Sadece ONAYLANMIŞ kayıtlar sayılır.
 */
export async function getMonthlyExtraShiftReport(year: number, month: number): Promise<MonthlyExtraRow[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const employees = await prisma.employee.findMany({
    where: { role: { in: ["VETERAN", "ANTRENOR", "SAGLIKCI"] }, active: true },
    orderBy: [{ role: "asc" }, { rotationOrder: "asc" }, { name: "asc" }],
  });

  const entries = await prisma.dayEntry.findMany({
    where: {
      date: { gte: start, lt: end },
      weeklyRequest: { status: "APPROVED" },
    },
    include: { weeklyRequest: true },
  });

  return employees
    // Sabit programlı antrenör (Eren Çelik) hiç talep girmez, ek mesai
    // kavramı onun için geçerli değil.
    .filter((emp) => !emp.antrenorFixed)
    .map((emp) => {
      const empEntries = entries.filter((e) => e.weeklyRequest.employeeId === emp.id);
      return {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role as "VETERAN" | "ANTRENOR" | "SAGLIKCI",
        extraShiftCount: empEntries.filter((e) => e.shift === "EXTRA" && !e.isSaturday).length,
        saturdayCount:
          emp.role === "VETERAN" ? empEntries.filter((e) => e.isSaturday).length : 0,
      };
    });
}
