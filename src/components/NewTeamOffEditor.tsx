"use client";

import { useActionState } from "react";
import { setNewTeamDayOff } from "@/app/actions/admin";
import { WEEKDAY_NAMES_TR } from "@/lib/week";

export default function NewTeamOffEditor({
  weekStartISO,
  employees,
}: {
  weekStartISO: string;
  employees: { id: string; name: string; dayOffIndex: number }[];
}) {
  return (
    <div className="space-y-2">
      {employees.map((emp) => (
        <Row key={emp.id} weekStartISO={weekStartISO} employee={emp} />
      ))}
    </div>
  );
}

function Row({
  weekStartISO,
  employee,
}: {
  weekStartISO: string;
  employee: { id: string; name: string; dayOffIndex: number };
}) {
  const [state, action, pending] = useActionState(setNewTeamDayOff, null);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
    >
      <input type="hidden" name="employeeId" value={employee.id} />
      <input type="hidden" name="weekStart" value={weekStartISO} />
      <span className="text-sm font-medium text-slate-800">{employee.name}</span>
      <div className="flex items-center gap-2">
        <select
          name="dayOffIndex"
          defaultValue={employee.dayOffIndex}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
        >
          {WEEKDAY_NAMES_TR.slice(0, 5).map((name, i) => (
            <option key={i} value={i}>
              {name} izinli
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {pending ? "..." : "Kaydet"}
        </button>
      </div>
      {state?.error && <p className="w-full text-xs text-rose-600">{state.error}</p>}
      {state?.success && !pending && (
        <p className="w-full text-xs font-medium text-emerald-600">✓ Kaydedildi</p>
      )}
    </form>
  );
}
