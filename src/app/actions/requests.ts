"use server";

import { prisma } from "@/lib/prisma";
import { requireVeteran } from "@/lib/session";
import { getUpcomingWeekStart, addDays, formatISODate, WEEKDAY_NAMES_TR } from "@/lib/week";
import { revalidatePath } from "next/cache";
import type { ShiftType } from "@prisma/client";

export type RequestActionState = { error?: string; success?: boolean } | null;

const VALID_SHIFTS: ShiftType[] = ["NORMAL", "LATE", "EXTRA", "OFF"];

export async function submitWeeklyRequest(
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  const session = await requireVeteran();

  const expectedWeekStart = getUpcomingWeekStart();
  const submittedWeekStart = String(formData.get("weekStart") ?? "");
  if (submittedWeekStart !== formatISODate(expectedWeekStart)) {
    return {
      error:
        "Bu form güncel talep haftası için değil. Lütfen sayfayı yenileyip tekrar deneyin.",
    };
  }
  const weekStart = expectedWeekStart;

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

  const offCount = shifts.filter((s) => s === "OFF").length;
  if (workingSaturday && offCount !== 1) {
    return {
      error:
        "Cumartesi çalışacaksanız, hafta içinden mecburen 1 gün izinli işaretlemeniz gerekiyor.",
    };
  }
  if (!workingSaturday && offCount > 0) {
    return {
      error:
        "Hafta içi izin sadece Cumartesi çalışanlar için geçerlidir. Cumartesi kutusunu işaretlemediniz.",
    };
  }

  // --- Cumartesi çakışma kontrolü ---
  if (workingSaturday) {
    const otherSaturday = await prisma.weeklyRequest.findFirst({
      where: {
        weekStart,
        workingSaturday: true,
        status: { in: ["PENDING", "APPROVED"] },
        employeeId: { not: session.employeeId },
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
