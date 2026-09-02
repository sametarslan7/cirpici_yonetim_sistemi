"use client";

import { useActionState, useState } from "react";
import { approveRequest, rejectRequest } from "@/app/actions/admin";
import { SHIFT_META } from "@/lib/constants";
import { WEEKDAY_NAMES_TR, formatTRDate } from "@/lib/week";
import type { ShiftType } from "@prisma/client";

type PendingRequest = {
  id: string;
  employeeName: string;
  workingSaturday: boolean;
  days: { date: Date; shift: ShiftType; isSaturday: boolean }[];
};

export default function ApprovalCard({ request }: { request: PendingRequest }) {
  const [approveState, approveAction, approvePending] = useActionState(approveRequest, null);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectRequest, null);
  const [rejecting, setRejecting] = useState(false);

  const weekdayDays = request.days.filter((d) => !d.isSaturday);
  const saturdayDay = request.days.find((d) => d.isSaturday);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{request.employeeName}</h3>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          Onay bekliyor
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {weekdayDays.map((d, i) => (
          <span
            key={i}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${SHIFT_META[d.shift].badge}`}
            title={`${WEEKDAY_NAMES_TR[i]} ${formatTRDate(d.date)}`}
          >
            {WEEKDAY_NAMES_TR[i].slice(0, 3)}: {SHIFT_META[d.shift].time}
          </span>
        ))}
        {saturdayDay && (
          <span className="rounded-md border border-teal-300 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
            Cts: 08:00-17:00
          </span>
        )}
      </div>

      {(approveState?.error || rejectState?.error) && (
        <p className="mt-2 text-sm text-rose-600">{approveState?.error ?? rejectState?.error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form action={approveAction}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            disabled={approvePending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {approvePending ? "..." : "Onayla"}
          </button>
        </form>

        {!rejecting ? (
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Reddet
          </button>
        ) : (
          <form action={rejectAction} className="flex flex-1 flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={request.id} />
            <input
              type="text"
              name="reason"
              placeholder="Red sebebi (opsiyonel)"
              className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={rejectPending}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {rejectPending ? "..." : "Onayla ve Reddet"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
