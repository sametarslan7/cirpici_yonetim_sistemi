"use server";

import { prisma } from "@/lib/prisma";
import { requireVeteran, requireNewTeam, requireFlexibleAntrenor, requireSaglikci } from "@/lib/session";
import { isRequestableWeekStart, parseISODate, addDays, WEEKDAY_NAMES_TR } from "@/lib/week";
import {
  getMondayCompOffEmployeeId,
  getNewTeamWeekOffs,
  isAntrenorMondayLateCoveredByOthers,
} from "@/lib/rotation";
import { revalidatePath } from "next/cache";
import type { ShiftType } from "@prisma/client";

export type RequestActionState = { error?: string; success?: boolean } | null;

const VALID_SHIFTS: ShiftType[] = ["NORMAL", "LATE", "EXTRA", "OFF"];
// Antrenör ve sağlıkçının kendi hafta içi günleri için seçebildiği saatler
// (OFF yalnızca Cumartesi karşılığı izin günü için sistem tarafından atanır,
// kişi kendisi seçemez).
const SELECTABLE_SHIFTS: ShiftType[] = ["NORMAL", "LATE", "EXTRA"];

export async function submitWeeklyRequest(
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  const session = await requireVeteran();

  const submittedWeekStart = String(formData.get("weekStart") ?? "");
  if (!isRequestableWeekStart(submittedWeekStart)) {
    return {
      error:
        "Bu form geçerli bir talep haftası için değil. Lütfen sayfayı yenileyip tekrar deneyin.",
    };
  }
  const weekStart = parseISODate(submittedWeekStart);

  // Zaten onaylanmış bir talep varsa, önce yönetici reddetmeden değiştirilemez.
  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
  });
  if (existing?.status === "APPROVED") {
    return {
      error:
        "Bu haftanın talebi zaten onaylandı. Değişiklik yapmak için Mahsum hocadan onayı geri almasını isteyin.",
    };
  }

  const workingSaturday = formData.get("workingSaturday") === "on";

  const shifts: ShiftType[] = [];
  for (let i = 0; i < 5; i++) {
    const raw = String(formData.get(`day_${i}`) ?? "");
    if (!VALID_SHIFTS.includes(raw as ShiftType)) {
      return { error: `${WEEKDAY_NAMES_TR[i]} günü için geçerli bir seçim yapmadınız.` };
    }
    shifts.push(raw as ShiftType);
  }

  // --- Pazartesi izni: sadece geçen hafta Cumartesi çalışan kişi için,
  // otomatik ve zorunlu (kendisi seçemez, sistem belirler) ---
  const mondayCompOffEmployeeId = await getMondayCompOffEmployeeId(weekStart);
  const isMondayCompOff = mondayCompOffEmployeeId === session.employeeId;
  const offCount = shifts.filter((s) => s === "OFF").length;

  if (isMondayCompOff) {
    if (shifts[0] !== "OFF" || offCount !== 1) {
      return {
        error:
          "Geçen hafta Cumartesi çalıştığınız için bu haftanın Pazartesi günü otomatik izinlidir; bu alan değiştirilemez. Lütfen sayfayı yenileyip tekrar deneyin.",
      };
    }
    // Geçen hafta Cumartesi çalışan kişi, bu hafta tekrar Cumartesi çalışamaz;
    // sıra diğer 4 arkadaşına geçmelidir.
    if (workingSaturday) {
      return {
        error:
          "Geçen hafta Cumartesi çalıştığınız için bu hafta Cumartesi çalışamazsınız; sıranın diğer arkadaşlarınıza geçmesi gerekiyor.",
      };
    }
  } else if (offCount > 0) {
    return {
      error:
        "İzin günü elle seçilemez. İzin, sadece geçen hafta Cumartesi çalışan kişi için bir sonraki haftanın Pazartesi günü sistem tarafından otomatik tanımlanır.",
    };
  }

  // --- Cumartesi çakışma kontrolü (sadece eski ekip kendi arasında) ---
  if (workingSaturday) {
    const otherSaturday = await prisma.weeklyRequest.findFirst({
      where: {
        weekStart,
        workingSaturday: true,
        status: { in: ["PENDING", "APPROVED"] },
        employeeId: { not: session.employeeId },
        employee: { role: "VETERAN" },
      },
      include: { employee: true },
    });
    if (otherSaturday) {
      return {
        error: `Bu hafta Cumartesi vardiyası zaten ${otherSaturday.employee.name} tarafından talep edildi/onaylandı.`,
      };
    }
  }

  // --- 11:00-20:00 (Geç Mesai) çakışma kontrolü: günde max 1 kişi ---
  for (let i = 0; i < 5; i++) {
    if (shifts[i] !== "LATE") continue;
    const date = addDays(weekStart, i);
    const conflict = await prisma.dayEntry.findFirst({
      where: {
        date,
        shift: "LATE",
        isSaturday: false,
        weeklyRequest: {
          employeeId: { not: session.employeeId },
          status: { in: ["PENDING", "APPROVED"] },
        },
      },
      include: { weeklyRequest: { include: { employee: true } } },
    });
    if (conflict) {
      return {
        error: `${WEEKDAY_NAMES_TR[i]} günü için 11:00-20:00 vardiyası zaten ${conflict.weeklyRequest.employee.name} tarafından seçildi. Bir günde en fazla 1 kişi bu saati seçebilir.`,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    const weeklyRequest = await tx.weeklyRequest.upsert({
      where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
      create: {
        employeeId: session.employeeId,
        weekStart,
        status: "PENDING",
        workingSaturday,
      },
      update: {
        status: "PENDING",
        workingSaturday,
        rejectionReason: null,
      },
    });

    await tx.dayEntry.deleteMany({ where: { weeklyRequestId: weeklyRequest.id } });

    const dayData = shifts.map((shift, i) => ({
      weeklyRequestId: weeklyRequest.id,
      date: addDays(weekStart, i),
      shift,
      isSaturday: false,
    }));

    if (workingSaturday) {
      dayData.push({
        weeklyRequestId: weeklyRequest.id,
        date: addDays(weekStart, 5),
        shift: "NORMAL",
        isSaturday: true,
      });
    }

    await tx.dayEntry.createMany({ data: dayData });
  });

  revalidatePath("/talep");
  revalidatePath("/admin");
  revalidatePath("/cizelge");

  return { success: true };
}

/**
 * Yeni ekip (fizyoterapist) için: hafta içi (Pzt-Cum) hangi gün izinli
 * olacaklarını kendileri seçebilir. Sistem rotasyonla bir öneri üretir
 * ([[suggestNewTeamDayOffIndex]]), ama kişi isterse değiştirip kendi
 * seçtiği günü kaydedebilir. Onay gerekmez (admin panelindeki
 * `setNewTeamDayOff` ile aynı kayda yazar); Mahsum hoca dilerse admin
 * panelinden yine değiştirebilir.
 */
export async function submitNewTeamDayOff(
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  const session = await requireNewTeam();

  const submittedWeekStart = String(formData.get("weekStart") ?? "");
  if (!isRequestableWeekStart(submittedWeekStart)) {
    return {
      error: "Bu form geçerli bir hafta için değil. Lütfen sayfayı yenileyip tekrar deneyin.",
    };
  }
  const weekStart = parseISODate(submittedWeekStart);

  const dayOffIndex = Number(formData.get("dayOffIndex"));
  if (!Number.isInteger(dayOffIndex) || dayOffIndex < 0 || dayOffIndex > 4) {
    return { error: "Lütfen izinli olmak istediğiniz günü seçin." };
  }

  // Aynı hafta içinde iki yeni ekip fizyoterapisti aynı güne izin
  // alamaz (o gün kimse kapatmasın diye). Diğerlerinin o haftaki
  // (öneri ya da kayıtlı) izin günüyle çakışıyorsa reddet.
  const others = (await getNewTeamWeekOffs(weekStart)).filter(
    (o) => o.employee.id !== session.employeeId
  );
  const conflict = others.find((o) => o.dayOffIndex === dayOffIndex);
  if (conflict) {
    return {
      error: `Bu gün zaten ${conflict.employee.name} için izinli görünüyor. Lütfen başka bir gün seçin.`,
    };
  }

  await prisma.newTeamWeekOff.upsert({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
    create: { employeeId: session.employeeId, weekStart, dayOffIndex },
    update: { dayOffIndex },
  });

  revalidatePath("/yeni-ekip-talep");
  revalidatePath("/admin");
  revalidatePath("/cizelge");

  return { success: true };
}

/**
 * Esnek antrenörler (sabit programlı olmayanlar) için: normalde hafta içi
 * 5 gün (08:00-17:00) çalışırlar, ama diğer ekipler gibi hafta içi
 * günlerinin saatini (08:00-17:00 / 11:00-20:00 / 08:00-20:00 ek mesai)
 * kendileri seçebilir — bazen hafta içi bir gün izin kullanmaları gerekip
 * karşılığında Cumartesi çalışmaları gibi durumlar için. İsterlerse -bir
 * haftada en fazla 1 antrenör olacak şekilde- Cumartesi (08:00-17:00)
 * çalışıp karşılığında AYNI hafta içinden kendi seçtikleri bir günü
 * izinli olurlar. Veteran sistemindeki gibi ertesi haftaya sarkan bir
 * telafi yoktur.
 *
 * Pazartesi kuralı: sabit programlı antrenör (Eren Çelik) her Pazartesi
 * izinlidir; onun 11:00-20:00'lık boşluğunu esnek antrenörlerden tam
 * olarak biri doldurmak zorundadır (bkz. [[isAntrenorMondayLateCoveredByOthers]]).
 */
export async function submitAntrenorWeeklyRequest(
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  const session = await requireFlexibleAntrenor();

  const submittedWeekStart = String(formData.get("weekStart") ?? "");
  if (!isRequestableWeekStart(submittedWeekStart)) {
    return {
      error:
        "Bu form geçerli bir talep haftası için değil. Lütfen sayfayı yenileyip tekrar deneyin.",
    };
  }
  const weekStart = parseISODate(submittedWeekStart);

  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
  });
  if (existing?.status === "APPROVED") {
    return {
      error:
        "Bu haftanın talebi zaten onaylandı. Değişiklik yapmak için Mahsum hocadan onayı geri almasını isteyin.",
    };
  }

  const workingSaturday = formData.get("workingSaturday") === "on";
  let offDayIndex: number | null = null;

  if (workingSaturday) {
    const raw = formData.get("offDayIndex");
    const parsed = raw === null ? NaN : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4) {
      return {
        error: "Cumartesi çalışmak için hafta içi hangi gün izin kullanacağınızı seçmelisiniz.",
      };
    }
    offDayIndex = parsed;

    // --- Cumartesi çakışma kontrolü (antrenörler kendi arasında, günde max 1) ---
    const otherSaturday = await prisma.weeklyRequest.findFirst({
      where: {
        weekStart,
        workingSaturday: true,
        status: { in: ["PENDING", "APPROVED"] },
        employeeId: { not: session.employeeId },
        employee: { role: "ANTRENOR" },
      },
      include: { employee: true },
    });
    if (otherSaturday) {
      return {
        error: `Bu hafta Cumartesi vardiyası zaten ${otherSaturday.employee.name} tarafından talep edildi/onaylandı.`,
      };
    }
  }

  const shifts: ShiftType[] = [];
  for (let i = 0; i < 5; i++) {
    if (i === offDayIndex) {
      shifts.push("OFF");
      continue;
    }
    const raw = String(formData.get(`day_${i}`) ?? "");
    if (!SELECTABLE_SHIFTS.includes(raw as ShiftType)) {
      return { error: `${WEEKDAY_NAMES_TR[i]} günü için geçerli bir saat seçmediniz.` };
    }
    shifts.push(raw as ShiftType);
  }

  // --- 11:00-20:00 (Geç Mesai) çakışma kontrolü: antrenör ekibi içinde günde max 1 kişi ---
  for (let i = 0; i < 5; i++) {
    if (shifts[i] !== "LATE") continue;
    const date = addDays(weekStart, i);
    const conflict = await prisma.dayEntry.findFirst({
      where: {
        date,
        shift: "LATE",
        isSaturday: false,
        weeklyRequest: {
          employeeId: { not: session.employeeId },
          status: { in: ["PENDING", "APPROVED"] },
          employee: { role: "ANTRENOR" },
        },
      },
      include: { weeklyRequest: { include: { employee: true } } },
    });
    if (conflict) {
      return {
        error: `${WEEKDAY_NAMES_TR[i]} günü için 11:00-20:00 vardiyası zaten ${conflict.weeklyRequest.employee.name} tarafından seçildi. Bir günde en fazla 1 antrenör bu saati seçebilir.`,
      };
    }
  }

  // --- Pazartesi kapsama kuralı: Eren o gün izinli; esnek antrenörlerden
  // tam olarak biri 11:00-20:00 çalışmalı. Bu kişi o gün izinli değilse ve
  // 11:00-20:00 seçmiyorsa, başka birinin karşıladığından emin olunmalı. ---
  if (shifts[0] !== "OFF" && shifts[0] !== "LATE") {
    const coveredByOther = await isAntrenorMondayLateCoveredByOthers(weekStart, session.employeeId);
    if (!coveredByOther) {
      return {
        error:
          "Pazartesi günü Eren izinli olduğu için ekip içinden birinin 11:00-20:00 çalışması gerekiyor. Bu gün için 11:00-20:00 seçin, ya da diğer antrenör arkadaşınızın bu saati seçmesini bekleyin.",
      };
    }
  }

  // Değişecek bir şey yoksa (Cumartesi de yok, tüm günler normal) onaya
  // gerek bırakmadan varsayılan tam haftaya döndür.
  if (!workingSaturday && shifts.every((s) => s === "NORMAL")) {
    if (existing) {
      await prisma.weeklyRequest.delete({ where: { id: existing.id } });
    }
    revalidatePath("/antrenor-talep");
    revalidatePath("/admin");
    revalidatePath("/cizelge");
    return { success: true };
  }

  await prisma.$transaction(async (tx) => {
    const weeklyRequest = await tx.weeklyRequest.upsert({
      where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
      create: {
        employeeId: session.employeeId,
        weekStart,
        status: "PENDING",
        workingSaturday,
      },
      update: {
        status: "PENDING",
        workingSaturday,
        rejectionReason: null,
      },
    });

    await tx.dayEntry.deleteMany({ where: { weeklyRequestId: weeklyRequest.id } });

    const dayData = shifts.map((shift, i) => ({
      weeklyRequestId: weeklyRequest.id,
      date: addDays(weekStart, i),
      shift,
      isSaturday: false,
    }));

    if (workingSaturday) {
      dayData.push({
        weeklyRequestId: weeklyRequest.id,
        date: addDays(weekStart, 5),
        shift: "NORMAL" as ShiftType,
        isSaturday: true,
      });
    }

    await tx.dayEntry.createMany({ data: dayData });
  });

  revalidatePath("/antrenor-talep");
  revalidatePath("/admin");
  revalidatePath("/cizelge");

  return { success: true };
}

/**
 * Sağlık ekibi için: normalde hafta içi (Pzt-Cum) 08:00-17:00 sabit
 * çalışırlar, Cumartesi hiç çalışmazlar. Antrenör ekibiyle aynı esneklik:
 * hafta içi günlerinin saatini (08:00-17:00 / 11:00-20:00 / 08:00-20:00 ek
 * mesai) kendileri seçebilir — bazen hafta içi bir gün izin kullanmaları
 * gerekip karşılığında Cumartesi çalışmaları gibi durumlar için. İsterlerse
 * -bir haftada en fazla 1 sağlıkçı olacak şekilde- Cumartesi (08:00-17:00)
 * çalışıp karşılığında AYNI hafta içinden kendi seçtikleri bir günü izinli
 * olurlar.
 */
export async function submitSaglikciWeeklyRequest(
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  const session = await requireSaglikci();

  const submittedWeekStart = String(formData.get("weekStart") ?? "");
  if (!isRequestableWeekStart(submittedWeekStart)) {
    return {
      error: "Bu form geçerli bir hafta için değil. Lütfen sayfayı yenileyip tekrar deneyin.",
    };
  }
  const weekStart = parseISODate(submittedWeekStart);

  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
  });
  if (existing?.status === "APPROVED") {
    return {
      error:
        "Bu haftanın talebi zaten onaylandı. Değişiklik yapmak için Mahsum hocadan onayı geri almasını isteyin.",
    };
  }

  const workingSaturday = formData.get("workingSaturday") === "on";
  let offDayIndex: number | null = null;

  if (workingSaturday) {
    const raw = formData.get("offDayIndex");
    const parsed = raw === null ? NaN : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4) {
      return {
        error: "Cumartesi çalışmak için hafta içi hangi gün izin kullanacağınızı seçmelisiniz.",
      };
    }
    offDayIndex = parsed;

    // --- Cumartesi çakışma kontrolü (sağlıkçılar kendi arasında, günde max 1) ---
    const otherSaturday = await prisma.weeklyRequest.findFirst({
      where: {
        weekStart,
        workingSaturday: true,
        status: { in: ["PENDING", "APPROVED"] },
        employeeId: { not: session.employeeId },
        employee: { role: "SAGLIKCI" },
      },
      include: { employee: true },
    });
    if (otherSaturday) {
      return {
        error: `Bu hafta Cumartesi vardiyası zaten ${otherSaturday.employee.name} tarafından talep edildi/onaylandı.`,
      };
    }
  }

  const shifts: ShiftType[] = [];
  for (let i = 0; i < 5; i++) {
    if (i === offDayIndex) {
      shifts.push("OFF");
      continue;
    }
    const raw = String(formData.get(`day_${i}`) ?? "");
    if (!SELECTABLE_SHIFTS.includes(raw as ShiftType)) {
      return { error: `${WEEKDAY_NAMES_TR[i]} günü için geçerli bir saat seçmediniz.` };
    }
    shifts.push(raw as ShiftType);
  }

  // --- 11:00-20:00 (Geç Mesai) çakışma kontrolü: sağlık ekibi içinde günde max 1 kişi ---
  for (let i = 0; i < 5; i++) {
    if (shifts[i] !== "LATE") continue;
    const date = addDays(weekStart, i);
    const conflict = await prisma.dayEntry.findFirst({
      where: {
        date,
        shift: "LATE",
        isSaturday: false,
        weeklyRequest: {
          employeeId: { not: session.employeeId },
          status: { in: ["PENDING", "APPROVED"] },
          employee: { role: "SAGLIKCI" },
        },
      },
      include: { weeklyRequest: { include: { employee: true } } },
    });
    if (conflict) {
      return {
        error: `${WEEKDAY_NAMES_TR[i]} günü için 11:00-20:00 vardiyası zaten ${conflict.weeklyRequest.employee.name} tarafından seçildi. Bir günde en fazla 1 sağlıkçı bu saati seçebilir.`,
      };
    }
  }

  // Değişecek bir şey yoksa (Cumartesi de yok, tüm günler normal) onaya
  // gerek bırakmadan varsayılan tam haftaya döndür.
  if (!workingSaturday && shifts.every((s) => s === "NORMAL")) {
    if (existing) {
      await prisma.weeklyRequest.delete({ where: { id: existing.id } });
    }
    revalidatePath("/panel");
    revalidatePath("/admin");
    revalidatePath("/cizelge");
    return { success: true };
  }

  await prisma.$transaction(async (tx) => {
    const weeklyRequest = await tx.weeklyRequest.upsert({
      where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
      create: {
        employeeId: session.employeeId,
        weekStart,
        status: "PENDING",
        workingSaturday,
      },
      update: {
        status: "PENDING",
        workingSaturday,
        rejectionReason: null,
      },
    });

    await tx.dayEntry.deleteMany({ where: { weeklyRequestId: weeklyRequest.id } });

    const dayData = shifts.map((shift, i) => ({
      weeklyRequestId: weeklyRequest.id,
      date: addDays(weekStart, i),
      shift,
      isSaturday: false,
    }));

    if (workingSaturday) {
      dayData.push({
        weeklyRequestId: weeklyRequest.id,
        date: addDays(weekStart, 5),
        shift: "NORMAL" as ShiftType,
        isSaturday: true,
      });
    }

    await tx.dayEntry.createMany({ data: dayData });
  });

  revalidatePath("/panel");
  revalidatePath("/admin");
  revalidatePath("/cizelge");

  return { success: true };
}
