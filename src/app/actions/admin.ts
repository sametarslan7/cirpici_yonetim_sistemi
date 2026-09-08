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
  const request = await prisma.weeklyRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!request) return { error: "Talep bulunamadı." };

  // Güvenlik amaçlı son bir kez daha çakışma kontrolü (aynı anda iki talep
  // onaylanmaya çalışılırsa diye). Eski ekip ve antrenör ekibinin Cumartesi
  // kontenjanları birbirinden bağımsız olduğu için role ile sınırlanır.
  if (request.workingSaturday) {
    const conflict = await prisma.weeklyRequest.findFirst({
      where: {
        weekStart: request.weekStart,
        workingSaturday: true,
        status: "APPROVED",
        id: { not: request.id },
        employee: { role: request.employee.role },
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

/**
 * Çizelgeden tek bir kişinin o haftaki mesai kaydını (WeeklyRequest +
 * DayEntry'leri, cascade ile) siler — yönetici, girilmiş bir mesaiyi
 * yanlış/gereksiz bulup kaldırmak istediğinde kullanılır. Onay/red
 * bekleyen ya da reddedilmiş kayıtlar da silinebilir. Sadece yönetici.
 */
export async function deleteWeeklyRequest(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Geçersiz kayıt." };

  const request = await prisma.weeklyRequest.findUnique({ where: { id } });
  if (!request) return { error: "Kayıt bulunamadı (zaten silinmiş olabilir)." };

  await prisma.weeklyRequest.delete({ where: { id } });

  revalidatePath("/cizelge");
  revalidatePath("/admin");
  revalidatePath("/talep");
  revalidatePath("/antrenor-talep");
  revalidatePath("/panel");
  return { success: true };
}

/**
 * Çizelgede görüntülenen haftanın TÜM mesai kayıtlarını (o haftaya ait
 * her WeeklyRequest + DayEntry'leri) siler — herkesi o haftanın
 * varsayılan/sabit programına döndürür. Yeni ekibin izin günü seçimi
 * (NewTeamWeekOff) bu işlemden etkilenmez, çünkü o "girilmiş mesai"
 * değil, gün seçimidir. Sadece yönetici.
 */
export async function deleteWeekSchedule(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireManager();
  const weekStartISO = String(formData.get("weekStart") ?? "");
  if (!weekStartISO) return { error: "Geçersiz hafta." };

  const weekStart = parseISODate(weekStartISO);
  await prisma.weeklyRequest.deleteMany({ where: { weekStart } });

  revalidatePath("/cizelge");
  revalidatePath("/admin");
  revalidatePath("/talep");
  revalidatePath("/antrenor-talep");
  revalidatePath("/panel");
  return { success: true };
}
