import { prisma } from "@/lib/prisma";
import LoginForm from "@/components/LoginForm";
import { MANAGERS } from "@/lib/constants";

export default async function LoginPage() {
  const [veterans, saglikEkibi, antrenorEkibi] = await Promise.all([
    prisma.employee.findMany({
      where: { role: "VETERAN", active: true },
      orderBy: { rotationOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: { role: "SAGLIKCI", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: { role: "ANTRENOR", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const sections = [
    { key: "fizyoterapist", title: "Fizyoterapistler", icon: "🩺", type: "employee" as const, members: veterans },
    { key: "saglikci", title: "Sağlıkçılar", icon: "❤️‍🩹", type: "employee" as const, members: saglikEkibi },
    { key: "antrenor", title: "Antrenör Ekibi", icon: "🏃", type: "employee" as const, members: antrenorEkibi },
    { key: "yonetici", title: "Yöneticiler", icon: "🗂️", type: "manager" as const, members: MANAGERS.map((m) => ({ id: m.id, name: m.name })) },
  ];

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:py-20">
      <h1 className="text-xl font-semibold text-slate-900">Giriş Yap</h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        Çırpıcı Sporcu Sağlığı ve Performans Merkezi — Vardiya Sistemi
      </p>
      <div className="mt-8 w-full">
        <LoginForm sections={sections} />
      </div>
    </div>
  );
}
