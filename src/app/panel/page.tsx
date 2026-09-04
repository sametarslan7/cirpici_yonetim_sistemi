import { requireStaff } from "@/lib/session";

const ROLE_LABEL: Record<"SAGLIKCI" | "ANTRENOR", string> = {
  SAGLIKCI: "Sağlık Ekibi",
  ANTRENOR: "Antrenör Ekibi",
};

export default async function PanelPage() {
  const session = await requireStaff();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
        {session.name.charAt(0)}
      </span>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">
        Hoş geldiniz, {session.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{ROLE_LABEL[session.role]}</p>
      <p className="mt-6 text-sm text-slate-500">
        Vardiya / gün belirleme sistemi yakında sizin için de aktif edilecek.
        Şimdilik haftalık çizelgeyi görüntüleyebilirsiniz.
      </p>
    </div>
  );
}
