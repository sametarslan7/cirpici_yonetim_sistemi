import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, formatISODate } from "@/lib/week";

/**
 * O hafta için Cumartesi mesaisine sırası gelen eski ekip elemanını önerir.
 * Kurallar:
 *  - Eski ekip rotationOrder'a göre sıralanır (1..5).
 *  - En son onaylanmış Cumartesi kaydına bakılır, sıradaki kişi önerilir.
 *  - Hiç kayıt yoksa ilk kişi (rotationOrder=1) önerilir.
 */
export async function suggestSaturdayEmployeeId(weekStart: Date): Promise<string | null> {
  const veterans = await prisma.employee.findMany({
    where: { role: "VETERAN", active: true },
    orderBy: { rotationOrder: "asc" },
  });
  if (veterans.length === 0) return null;

  const lastAssignment = await prisma.weeklyRequest.findFirst({
    where: {
      workingSaturday: true,
      status: "APPROVED",
      weekStart: { lt: weekStart },
    },
    orderBy: { weekStart: "desc" },
    include: { employee: true },
  });

  if (!lastAssignment || lastAssignment.employee.rotationOrder == null) {
    return veterans[0].id;
  }

  const currentOrder = lastAssignment.employee.rotationOrder;
  const nextOrder = (currentOrder % veterans.length) + 1;
  const next = veterans.find((v) => v.rotationOrder === nextOrder);
  return next?.id ?? veterans[0].id;
}

/**
 * O hafta zaten Cumartesi'yi Mahsum hocanın onayladığı/bekleyen biri varsa
 * onun id'sini döndürür (varsa formda onu göstermek/kilitlemek için).
 */
export async function getSaturdayTakenBy(weekStart: Date) {
  const existing = await prisma.weeklyRequest.findFirst({
    where: {
      weekStart,
      workingSaturday: true,
      status: { in: ["PENDING", "APPROVED"] },
    },
    include: { employee: true },
  });
  return existing;
}

/**
 * Cumartesi mesaisinin telafisi: bir önceki hafta Cumartesi'yi ONAYLANMIŞ
 * olarak çalışan kişi varsa, o kişinin id'sini döner. Bu kişi için, bir
 * sonraki haftanın Pazartesi günü otomatik ve zorunlu olarak izinlidir —
 * kendisi o haftanın Pazartesi'sini elle seçmez, sistem belirler. Cumartesi
 * çalıştığı haftanın kendi içinde (Pzt-Cum) izin hakkı yoktur; o hafta tam
 * çalışır.
 */
export async function getMondayCompOffEmployeeId(weekStart: Date): Promise<string | null> {
  const previousWeekStart = addDays(weekStart, -7);
  const lastSaturdayWork = await prisma.weeklyRequest.findFirst({
    where: {
      weekStart: previousWeekStart,
      workingSaturday: true,
      status: "APPROVED",
    },
  });
  return lastSaturdayWork?.employeeId ?? null;
}

/**
 * Yeni ekibin o hafta hangi gün izinli olacağına dair varsayılan (rotasyonlu)
 * öneriyi üretir. Mahsum hoca yönetici panelinden değiştirebilir; DB'de kayıt
 * varsa bu öneri yerine o kayıt kullanılır.
 */
const ROTATION_EPOCH = new Date("2026-01-05T00:00:00.000Z"); // bir Pazartesi

export function suggestNewTeamDayOffIndex(weekStart: Date, rotationOrder: number): number {
  const weeksSinceEpoch = Math.round(
    (weekStart.getTime() - ROTATION_EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  // rotationOrder 1,2,3 -> ofset 0,1,2. Her hafta bir kaydırılır, böylece
  // 3 kişi farklı günlerde ve haftadan haftaya değişerek izinli olur.
  const offset = (rotationOrder - 1 + weeksSinceEpoch) % 5;
  return ((offset % 5) + 5) % 5; // negatif olmasın diye güvenlik
}

export async function getNewTeamWeekOffs(weekStart: Date) {
  const newTeam = await prisma.employee.findMany({
    where: { role: "NEW", active: true },
    orderBy: { rotationOrder: "asc" },
  });
  const overrides = await prisma.newTeamWeekOff.findMany({ where: { weekStart } });
  const overrideMap = new Map(overrides.map((o) => [o.employeeId, o.dayOffIndex]));

  return newTeam.map((emp) => ({
    employee: emp,
    dayOffIndex:
      overrideMap.get(emp.id) ??
      suggestNewTeamDayOffIndex(weekStart, emp.rotationOrder ?? 1),
    isOverridden: overrideMap.has(emp.id),
  }));
}

export function weekKey(weekStart: Date) {
  return formatISODate(weekStart);
}
