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

// 2026-09-21 (bu yazının yapıldığı hafta olan 2026-09-14'ten sonraki ilk
// talep edilebilir hafta) haftasından İTİBAREN yeni ekip için Cumartesi
// artık haftalık, bağımsız/sınırsız bir tercih: kişi o hafta Cumartesi
// çalışmak isterse hafta içi izin günü kendisi tarafından seçilmez, sistem
// otomatik olarak Pazartesi'ye atar (kronolojik olarak: önceki hafta sonu
// normal izin -> Pazartesi izin -> Salı-Cumartesi 5 gün çalışma -> Pazar
// normal izin). Çalışmak istemezse eskisi gibi hafta içinden (Pzt-Cum)
// rotasyonla/kendi seçtiği bir gün izinli olur, Cumartesi çalışmaz.
// Bu tarihten ÖNCEKİ haftalar geriye dönük olarak değişmesin diye eski
// davranışı (Cumartesi herkes için sabit çalışılır) korur.
export const NEW_TEAM_SATURDAY_OPT_IN_EPOCH = new Date("2026-09-21T00:00:00.000Z");

export async function getNewTeamWeekOffs(weekStart: Date) {
  const newTeam = await prisma.employee.findMany({
    where: { role: "NEW", active: true },
    orderBy: { rotationOrder: "asc" },
  });
  const overrides = await prisma.newTeamWeekOff.findMany({ where: { weekStart } });
  const overrideMap = new Map(overrides.map((o) => [o.employeeId, o]));
  const saturdayOptInActive = weekStart.getTime() >= NEW_TEAM_SATURDAY_OPT_IN_EPOCH.getTime();

  return newTeam.map((emp) => {
    const override = overrideMap.get(emp.id);

    if (!saturdayOptInActive) {
      // Eski sistem: Cumartesi sabit çalışılır, izin günü rotasyonla.
      return {
        employee: emp,
        workingSaturday: true,
        dayOffIndex:
          override?.dayOffIndex ?? suggestNewTeamDayOffIndex(weekStart, emp.rotationOrder ?? 1),
        isOverridden: Boolean(override),
      };
    }

    const workingSaturday = override?.workingSaturday ?? false;
    return {
      employee: emp,
      workingSaturday,
      // Cumartesi çalışan otomatik Pazartesi izinlidir — bu gün seçilemez.
      dayOffIndex: workingSaturday
        ? 0
        : override?.dayOffIndex ?? suggestNewTeamDayOffIndex(weekStart, emp.rotationOrder ?? 1),
      isOverridden: Boolean(override) && !workingSaturday,
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
