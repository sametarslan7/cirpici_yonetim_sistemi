"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MANAGERS } from "@/lib/constants";
import { redirect } from "next/navigation";

// Her yöneticinin şifresi kendi ortam değişkeninde tutulur.
const MANAGER_PASSWORDS: Record<string, string | undefined> = {
  mahsum: process.env.MANAGER_PASSWORD,
  osman: process.env.MANAGER2_PASSWORD,
};

export type AuthActionState = { error?: string } | null;

export async function loginEmployee(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!employeeId) return { error: "Lütfen listeden bir isim seçin." };

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.role !== "VETERAN" || !employee.active) {
    return { error: "Geçersiz kullanıcı." };
  }
  if (!password || password !== employee.password) {
    return { error: "Şifre hatalı." };
  }

  const session = await getSession();
  session.employeeId = employee.id;
  session.name = employee.name;
  session.role = "VETERAN";
  await session.save();

  redirect("/talep");
}

export async function loginManager(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const managerId = String(formData.get("managerId") ?? "");
  const password = String(formData.get("password") ?? "");

  const manager = MANAGERS.find((m) => m.id === managerId);
  if (!manager || !password || password !== MANAGER_PASSWORDS[managerId]) {
    return { error: "Şifre hatalı." };
  }

  const session = await getSession();
  session.employeeId = undefined;
  session.name = manager.name;
  session.role = "MANAGER";
  await session.save();

  redirect("/admin");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
