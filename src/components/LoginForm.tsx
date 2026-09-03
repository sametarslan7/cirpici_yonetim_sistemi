"use client";

import { useActionState, useState } from "react";
import { loginEmployee, loginManager } from "@/app/actions/auth";

type Manager = { id: string; name: string };

export default function LoginForm({
  veterans,
  managers,
}: {
  veterans: { id: string; name: string }[];
  managers: readonly Manager[];
}) {
  const [managerId, setManagerId] = useState<string | null>(null);
  const [employeeState, employeeAction, employeePending] = useActionState(
    loginEmployee,
    null
  );
  const [managerState, managerAction, managerPending] = useActionState(
    loginManager,
    null
  );

  const activeManager = managers.find((m) => m.id === managerId);

  if (activeManager) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Yönetici Girişi</h2>
        <p className="mt-1 text-xs text-slate-500">{activeManager.name}</p>
        <form action={managerAction} className="mt-4 space-y-3">
          <input type="hidden" name="managerId" value={activeManager.id} />
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            autoFocus
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {managerState?.error && (
            <p className="text-sm text-rose-600">{managerState.error}</p>
          )}
          <button
            type="submit"
            disabled={managerPending}
            className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {managerPending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setManagerId(null)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-700"
        >
          ← Personel listesine dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {veterans.map((emp) => (
        <form key={emp.id} action={employeeAction}>
          <input type="hidden" name="employeeId" value={emp.id} />
          <button
            type="submit"
            disabled={employeePending}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {emp.name.charAt(0)}
            </span>
            <span className="text-sm font-medium text-slate-800">{emp.name}</span>
          </button>
        </form>
      ))}

      {employeeState?.error && (
        <p className="text-sm text-rose-600">{employeeState.error}</p>
      )}

      {managers.map((manager) => (
        <button
          key={manager.id}
          type="button"
          onClick={() => setManagerId(manager.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            {manager.name.charAt(0)}
          </span>
          <span className="text-sm font-medium text-slate-800">
            {manager.name} <span className="text-slate-400">(Yönetici)</span>
          </span>
        </button>
      ))}
    </div>
  );
}
