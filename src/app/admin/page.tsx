import { requireManager } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUpcomingWeekStart, formatISODate, formatTRDate, addDays } from "@/lib/week";
import { getNewTeamWeekOffs } from "@/lib/rotation";
import ApprovalCard from "@/components/ApprovalCard";
import NewTeamOffEditor from "@/components/NewTeamOffEditor";
import Link from "next/link";

export default async function AdminPage() {
  await requireManager();

  const weekStart = getUpcomingWeekStart();

  const pendingRequests = await prisma.weeklyRequest.findMany({
    where: { status: "PENDING" },
    include: { employee: true, days: { orderBy: { date: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const newTeamOffs = await getNewTeamWeekOffs(weekStart);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Onay Paneli</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatTRDate(weekStart)} - {formatTRDate(addDays(weekStart, 5))} haftası talepleri
          </p>
        </div>
        <Link
          href="/cizelge"
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Çizelgeyi Gör
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bekleyen Talepler ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
            Bekleyen talep yok.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <ApprovalCard
                key={r.id}
                request={{
                  id: r.id,
                  employeeName: r.employee.name,
                  workingSaturday: r.workingSaturday,
                  days: r.days,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Yeni Ekip — Bu Hafta İzin Günleri
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Sistem rotasyonlu olarak önerir, dilerseniz değiştirip kaydedebilirsiniz.
        </p>
        <NewTeamOffEditor
          weekStartISO={formatISODate(weekStart)}
          employees={newTeamOffs.map((o) => ({
            id: o.employee.id,
            name: o.employee.name,
            dayOffIndex: o.dayOffIndex,
          }))}
        />
      </section>
    </div>
  );
}
