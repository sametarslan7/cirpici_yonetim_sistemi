import Link from "next/link";
import { getSession } from "@/lib/session";
import { logout } from "@/app/actions/auth";

export default async function Header() {
  const session = await getSession();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
            ÇS
          </span>
          <span className="hidden text-sm font-semibold text-slate-800 sm:block">
            Çırpıcı Sporcu Sağlığı ve Performans Merkezi
          </span>
        </Link>

        {session.role && (
          <nav className="flex items-center gap-1 sm:gap-2">
            {session.role === "VETERAN" && (
              <NavLink href="/talep">Haftalık Talebim</NavLink>
            )}
            {(session.role === "SAGLIKCI" || session.role === "ANTRENOR") && (
              <NavLink href="/panel">Panelim</NavLink>
            )}
            <NavLink href="/cizelge">Çizelge</NavLink>
            {session.role === "MANAGER" && (
              <>
                <NavLink href="/admin">Onay Paneli</NavLink>
                <NavLink href="/rapor">Aylık Rapor</NavLink>
              </>
            )}
            <span className="mx-1 hidden text-sm text-slate-400 sm:block">|</span>
            <span className="hidden text-sm text-slate-600 sm:block">{session.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Çıkış
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
