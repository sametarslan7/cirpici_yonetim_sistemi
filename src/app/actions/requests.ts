"use server";

import { prisma } from "@/lib/prisma";
import { requireVeteran, requireNewTeam, requireFlexibleAntrenor, requireSaglikci } from "@/lib/session";
import { isRequestableWeekStart, parseISODate, addDays, WEEKDAY_NAMES_TR } from "@/lib/week";
import { getNewTeamWeekOffs, isLastVeteranToSubmit } from "@/lib/rotation";
import { getLateConflictMap, getClosingCoveredDays } from "@/lib/schedule";
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

  // Onaya gönderilmiş (PENDING) ya da onaylanmış (APPROVED) bir talep,
  // yönetici reddetmeden/onayı geri almadan değiştirilemez — kilitlidir.
  const existing = await prisma.weeklyRequest.findUnique({
    where: { employeeId_weekStart: { employeeId: session.employeeId, weekStart } },
  });
  if (existing?.status === "PENDING" || existing?.status === "APPROVED") {
    return {
      error:
        existing.status === "APPROVED"
          ? "Bu haftanın talebi zaten onaylandı. Değişiklik yapmak için Mahsum hocadan onayı geri almasını isteyin."
          : "Bu haftanın talebi onay bekliyor ve kilitli. Değişiklik yapmak için Mahsum hocadan reddetmesini isteyin.",
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

  // --- İzin günü: Cumartesi çalışmayı seçen kişi, aynı hafta içinden bir
  // gün (varsayılan Pazartesi, formda değiştirilebilir) izinli olur.
  // Cumartesi çalışmayanın izin hakkı yoktur, hafta içi 5 gün de çalışır. ---
  const offCount = shifts.filter((s) => s === "OFF").length;

  if (workingSaturday) {
    if (offCount !== 1) {
      return {
        error: "Cumartesi çalışacaksanız hafta içinden bir gün izinli olarak işaretlemelisiniz.",
      };
    }
  } else if (offCount > 0) {
    return {
      error:
        "İzin günü sadece Cumartesi çalışmayı seçtiğinizde belirlenebilir.",
    };
  }

  // Not: Cumartesi'de eski ekip içinde tek kişilik bir kontenjan yok — herkes
  // birbirinden bağımsız olarak kendi haftasında bu seçeneği kullanabilir.

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
          employee: { role: "VETERAN" },
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

  // --- Hafta içi kapsama: her gün en az 1 kişi 20:00'a kadar kalmalı
  // (LATE ya da EXTRA seçimi, ikisi de 20:00'da bitiyor). Talepler
  // bağımsız gönderildiği için bu kontrol sadece o haftanın SON talebini
  // gönderen kişiye uygulanır — önce gönderenler kimseyi beklemeden
  // serbestçe seçim yapabilir (bkz. isLastVeteranToSubmit). ---
  if (await isLastVeteranToSubmit(weekStart, session.employeeId)) {
    const closingCovered = await getClosingCoveredDays(weekStart, session.employeeId, "VETERAN");
    const uncoveredDays: string[] = shifts
      .map((shift, i) =>
        shift !== "LATE" && shift !== "EXTRA" && !closingCovered[i] ? WEEKDAY_NAMES_TR[i] : null
      )
      .filter((label): label is (typeof WEEKDAY_NAMES_TR)[number] => label !== null);
    if (uncoveredDays.length > 0) {
      return {
        error: `Hafta içi her gün en az 1 kişi 20:00'a kadar (11:00-20:00 ya da 08:00-20:00) çalışmalı. Şu gün(ler) için ekipten kimse bu saatlerden birini seçmemiş: ${uncoveredDays.join(", ")}. Ekipte en son siz talep gönderdiğiniz için bu gün(ler) için bu saatlerden birini seçmeniz gerekiyor.`,
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
 *
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
  const workingSaturday = true;

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
    create: { employeeId: session.employeeId, weekStart, dayOffIndex, workingSaturday },
    update: { dayOffIndex, workingSaturday },
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
 * Pazartesi notu: sabit programlı antrenör (Eren Çelik) her Pazartesi
 * izinlidir; onun 11:00-20:00'lık boşluğunu esnek antrenörlerden birinin
 * doldurması idealdir, ama bu artık talep gönderirken zorunlu tutulmuyor
 * (kimse diğerinin seçimini beklemek zorunda kalmasın diye) — sadece
 * formda bilgilendirme notu olarak gösterilir.
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
  if (existing?.status === "PENDING" || existing?.status === "APPROVED") {
    return {
      error:
        existing.status === "APPROVED"
          ? "Bu haftanın talebi zaten onaylandı. Değişiklik yapmak için Mahsum hocadan onayı geri almasını isteyin."
          : "Bu haftanın talebi onay bekliyor ve kilitli. Değişiklik yapmak için Mahsum hocadan reddetmesini isteyin.",
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
    // Not: Cumartesi'de esnek antrenörler arasında tek kişilik bir kontenjan
    // yok — herkes birbirinden bağımsız olarak kendi haftasında bu seçeneği
    // kullanabilir.
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

  // Pazartesi kapsama: Eren o gün izinli olduğu için ekipten birinin
  // 11:00-20:00 çalışması idealdir, ama bu artık zorunlu tutulmuyor — her
  // antrenör diğerinin seçimini beklemeden kendi talebini gönderebilir
  // (bkz. AntrenorRequestForm'daki bilgilendirme notu).

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
  if (existing?.status === "PENDING" || existing?.status === "APPROVED") {
    return {
      error:
        existing.status === "APPROVED"
          ? "Bu haftanın talebi zaten onaylandı. Değişiklik yapmak için Mahsum hocadan onayı geri almasını isteyin."
          : "Bu haftanın talebi onay bekliyor ve kilitli. Değişiklik yapmak için Mahsum hocadan reddetmesini isteyin.",
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
    // Sağlık ekibinde Cumartesi için tek kişilik bir kontenjan yok — herkes
    // birbirinden bağımsız olarak kendi haftasında bu seçeneği kullanabilir.
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
