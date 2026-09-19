import "server-only";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/week";

// NOT: Eski ekip için "bir sonraki haftanın Pazartesi'si otomatik telafi
// izni" mekanizması (getMondayCompOffEmployeeId) 2026-09-18'de kaldırıldı.
// Artık antrenör/sağlıkçı/yeni ekip ile aynı mantık: Cumartesi çalışmayı
// seçen kişi AYNI hafta içinden bir gün izinli olur (varsayılan Pazartesi,
// kendisi değiştirebilir) — bkz. submitWeeklyRequest (requests.ts).

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

// Yeni ekip Cumartesi sabit çalışır (opsiyonel/tercihli değil) — sadece
// hafta içinden (Pzt-Cum) hangi gün izinli olacakları rotasyonla önerilir,
// kendileri ya da yönetici değiştirebilir. 2026-09 içinde Cumartesi'yi
// haftalık tercihe çeviren bir deneme yapıldı, sonra yeni ekip
// fizyoterapistlerinin zaten sabit Cumartesi çalıştığı netleşince geri
// alındı.
export async function getNewTeamWeekOffs(weekStart: Date) {
  const newTeam = await prisma.employee.findMany({
    where: { role: "NEW", active: true },
    orderBy: { rotationOrder: "asc" },
  });
  const overrides = await prisma.newTeamWeekOff.findMany({ where: { weekStart } });
  const overrideMap = new Map(overrides.map((o) => [o.employeeId, o]));

  return newTeam.map((emp) => {
    const override = overrideMap.get(emp.id);
    return {
      employee: emp,
      workingSaturday: true,
      dayOffIndex:
        override?.dayOffIndex ?? suggestNewTeamDayOffIndex(weekStart, emp.rotationOrder ?? 1),
      isOverridden: Boolean(override),
    };
  });
}

export function weekKey(weekStart: Date) {
  return formatISODate(weekStart);
}

// NOT: Pazartesi kapsama kontrolü (isAntrenorMondayLateCoveredByOthers) 2026-09-13'te
// kaldırıldı — antrenörler artık birbirinin seçimini beklemeden doğrudan talep
// gönderebiliyor. Eren'in Pazartesi 11:00-20:00 boşluğu sadece bir bilgilendirme
// notu olarak AntrenorRequestForm'da gösteriliyor, talebi engellemiyor.

/**
 * Eski ekipte hafta içi (Pzt-Cum) her gün en az 1 kişi 11:00-20:00 (Geç
 * Mesai) çalışmalı — klinik akşam 20:00'a kadar açık kalabilsin diye.
 * Talepler ekip üyeleri tarafından birbirinden bağımsız gönderildiği için
 * bu kural yalnızca o haftanın SON talebini gönderen kişiye uygulanır:
 * önce gönderenler kimseyi beklemeden serbestçe seçim yapabilir, ama
 * hepsi gönderdiğinde hâlâ kapsanmayan bir gün kalmışsa son kişi o günü
 * kapatmak zorunda kalır (bkz. [[submitWeeklyRequest]] / [[getLateConflictMap]]).
 */
export async function isLastVeteranToSubmit(
  weekStart: Date,
  excludeEmployeeId: string
): Promise<boolean> {
  const others = await prisma.employee.findMany({
    where: { role: "VETERAN", active: true, id: { not: excludeEmployeeId } },
    select: { id: true },
  });
  if (others.length === 0) return true;

  const othersSubmitted = await prisma.weeklyRequest.count({
    where: {
      weekStart,
      status: { in: ["PENDING", "APPROVED"] },
      employeeId: { in: others.map((o) => o.id) },
    },
  });
  return othersSubmitted === others.length;
}
