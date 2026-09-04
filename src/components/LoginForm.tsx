"use client";

import { useActionState, useState } from "react";
import { loginEmployee, loginManager } from "@/app/actions/auth";

type Member = { id: string; name: string };
type Section = {
  key: string;
  title: string;
  icon: string;
  type: "employee" | "manager";
  members: Member[];
};

export default function LoginForm({ sections }: { sections: Section[] }) {
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ section: Section; member: Member } | null>(null);

  const [employeeState, employeeAction, employeePending] = useActionState(
    loginEmployee,
    null
  );
  const [managerState, managerAction, managerPending] = useActionState(
    loginManager,
    null
  );

  // 3. seviye: seçilen kişi için şifre formu
  if (selected) {
    const isManager = selected.section.type === "manager";
    const state = isManager ? managerState : employeeState;
    const pending = isManager ? managerPending : employeePending;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          {isManager ? "Yönetici Girişi" : "Giriş"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{selected.member.name}</p>
        <form
          action={isManager ? managerAction : employeeAction}
          className="mt-4 space-y-3"
        >
          <input
            type="hidden"
            name={isManager ? "managerId" : "employeeId"}
            value={selected.member.id}
          />
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            autoFocus
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-700"
        >
          ← {selected.section.title} listesine dön
        </button>
      </div>
    );
  }

  // 2. seviye: açılan bölümün isim listesi
  const openSection = sections.find((s) => s.key === openSectionKey);
  if (openSection) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOpenSectionKey(null)}
          className="mb-2 text-xs text-slate-500 hover:text-slate-700"
        >
          ← Bölümlere dön
        </button>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span>{openSection.icon}</span> {openSection.title}
        </h2>
        {openSection.members.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
            Bu bölümde henüz kayıtlı kimse yok.
          </p>
        )}
        {openSection.members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setSelected({ section: openSection, member })}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {member.name.charAt(0)}
            </span>
            <span className="text-sm font-medium text-slate-800">{member.name}</span>
          </button>
        ))}
      </div>
    );
  }

  // 1. seviye: bölüm kartları
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => setOpenSectionKey(section.key)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-lg">
            {section.icon}
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-slate-800">
              {section.title}
            </span>
            <span className="block text-xs text-slate-400">
              {section.members.length} kişi
            </span>
          </span>
          <span className="text-slate-300">→</span>
        </button>
      ))}
    </div>
  );
}
