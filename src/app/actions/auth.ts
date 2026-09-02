"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MANAGER_NAME } from "@/lib/constants";
import { redirect } from "next/navigation";

export type AuthActionState = { error?: string } | null;

export async function loginEmployee(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return { error: "Lütfen listeden bir isim seçin." };

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.role !== "VETERAN" || !employee.active) {
    return { error: "Geçersiz kullanıcı." };
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
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.MANAGER_PASSWORD) {
    return { error: "Şifre hatalı." };
  }

  const session = await getSession();
  session.employeeId = undefined;
  session.name = MANAGER_NAME;
  session.role = "MANAGER";
  await session.save();

  redirect("/admin");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
