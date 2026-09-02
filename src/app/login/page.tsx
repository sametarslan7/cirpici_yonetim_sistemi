import { prisma } from "@/lib/prisma";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const veterans = await prisma.employee.findMany({
    where: { role: "VETERAN", active: true },
    orderBy: { rotationOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:py-20">
      <h1 className="text-xl font-semibold text-slate-900">Giriş Yap</h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        Çırpıcı Sporcu Sağlığı ve Performans Merkezi — Vardiya Sistemi
      </p>
      <div className="mt-8 w-full">
        <LoginForm veterans={veterans} />
      </div>
    </div>
  );
}
