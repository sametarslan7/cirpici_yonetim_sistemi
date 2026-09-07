export default function StatusBanner({
  status,
  reason,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
}) {
  const map = {
    PENDING: { text: "Talebiniz onay bekliyor.", classes: "bg-amber-50 text-amber-800 border-amber-200" },
    APPROVED: { text: "Talebiniz onaylandı ✅", classes: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    REJECTED: {
      text: `Talebiniz reddedildi. Sebep: ${reason || "belirtilmedi"}. Lütfen düzenleyip tekrar gönderin.`,
      classes: "bg-rose-50 text-rose-800 border-rose-200",
    },
  } as const;
  const info = map[status];
  return (
    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${info.classes}`}>{info.text}</div>
  );
}
