"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { parseISODate } from "@/lib/week";

export type AdminActionState = { error?: string; success?: boolean } | null;

export async function approveRequest(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  const request = await prisma.weeklyRequest.findUnique({ where: { id } });
  if (!request) return { error: "Talep bulunamadı." };

  // Güvenlik amaçlı son bir kez daha çakışma kontrolü (aynı anda iki talep
  // onaylanmaya çalışılırsa diye).
  if (request.workingSaturday) {
    const conflict = await prisma.weeklyRequest.findFirst({
      where: {
        weekStart: request.weekStart,
        workingSaturday: true,
        status: "APPROVED",
        id: { not: request.id },
      },
      include: { employee: true },
    });
    if (conflict) {
      return {
        error: `Bu hafta Cumartesi vardiyası zaten ${conflict.employee.name} için onaylanmış. Önce onu düzeltin.`,
      };
    }
  }

  await prisma.weeklyRequest.update({
    where: { id },
    data: { status: "APPROVED", rejectionReason: null },
  });

  revalidatePath("/admin");
  revalidatePath("/talep");
  revalidatePath("/cizelge");
  return { success: true };
}

export async function rejectRequest(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const request = await prisma.weeklyRequest.findUnique({ where: { id } });
  if (!request) return { error: "Talep bulunamadı." };

  await prisma.weeklyRequest.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: reason || "Belirtilmedi" },
  });

  revalidatePath("/admin");
  revalidatePath("/talep");
  revalidatePath("/cizelge");
  return { success: true };
}

export async function setNewTeamDayOff(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireManager();
  const employeeId = String(formData.get("employeeId") ?? "");
  const weekStartISO = String(formData.get("weekStart") ?? "");
  const dayOffIndex = Number(formData.get("dayOffIndex"));

  if (!employeeId || !weekStartISO || Number.isNaN(dayOffIndex) || dayOffIndex < 0 || dayOffIndex > 4) {
    return { error: "Geçersiz veri." };
  }

  const weekStart = parseISODate(weekStartISO);

  await prisma.newTeamWeekOff.upsert({
    where: { employeeId_weekStart: { employeeId, weekStart } },
    create: { employeeId, weekStart, dayOffIndex },
    update: { dayOffIndex },
  });

  revalidatePath("/admin");
  revalidatePath("/cizelge");
  return { success: true };
}
