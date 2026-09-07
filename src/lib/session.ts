import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";

export type SessionData = {
  employeeId?: string;
  name?: string;
  role?: "MANAGER" | "VETERAN" | "NEW" | "SAGLIKCI" | "ANTRENOR";
  // Sadece role "ANTRENOR" için anlamlı: sabit programlı (Eren Çelik gibi)
  // antrenörler gün belirleme talebi giremez.
  antrenorFixed?: boolean;
};

const password = process.env.SESSION_SECRET;
if (!password || password.length < 32) {
  throw new Error(
    "SESSION_SECRET tanımlı değil ya da çok kısa (.env dosyasına en az 32 karakter uzunluğunda bir değer ekleyin)."
  );
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "cirpici_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
  ttl: 60 * 60 * 24 * 30, // 30 gün
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** Oturum yoksa girişe yönlendirir, varsa mevcut oturumu döndürür. */
export async function requireSession() {
  const session = await getSession();
  if (!session.role) {
    redirect("/login");
  }
  return session;
}

/** Sadece eski ekip (talep girebilen) kullanıcıların erişebileceği sayfalar için. */
export async function requireVeteran() {
  const session = await requireSession();
  if (session.role !== "VETERAN" || !session.employeeId) {
    redirect("/login");
  }
  return session as SessionData & { employeeId: string; name: string; role: "VETERAN" };
}

/** Sadece yeni ekip (gün belirleme talebi girebilen) kullanıcıların erişebileceği sayfalar için. */
export async function requireNewTeam() {
  const session = await requireSession();
  if (session.role !== "NEW" || !session.employeeId) {
    redirect("/login");
  }
  return session as SessionData & { employeeId: string; name: string; role: "NEW" };
}

/**
 * Sağlıkçı ve antrenör ekibi (sabit programlı olanlar dahil) erişimi için.
 * Gün belirleme talebi giren esnek antrenörler için [[requireFlexibleAntrenor]]
 * kullanılır.
 */
export async function requireStaff() {
  const session = await requireSession();
  if (
    (session.role !== "SAGLIKCI" && session.role !== "ANTRENOR") ||
    !session.employeeId
  ) {
    redirect("/login");
  }
  return session as SessionData & {
    employeeId: string;
    name: string;
    role: "SAGLIKCI" | "ANTRENOR";
  };
}

/**
 * Sadece esnek (sabit programlı olmayan) antrenörler için — Cumartesi/izin
 * günü talebi girebilen kişiler. Eren Çelik gibi sabit programlılar bu
 * sayfaya erişemez, /panel'e yönlenir.
 */
export async function requireFlexibleAntrenor() {
  const session = await requireSession();
  if (session.role !== "ANTRENOR" || session.antrenorFixed || !session.employeeId) {
    redirect("/login");
  }
  return session as SessionData & { employeeId: string; name: string; role: "ANTRENOR" };
}

/** Sadece sağlık ekibi için — ek mesai (08:00-20:00) talebi girebilen kişiler. */
export async function requireSaglikci() {
  const session = await requireSession();
  if (session.role !== "SAGLIKCI" || !session.employeeId) {
    redirect("/login");
  }
  return session as SessionData & { employeeId: string; name: string; role: "SAGLIKCI" };
}

/** Sadece yönetici (Mahsum hoca) erişimi için. */
export async function requireManager() {
  const session = await requireSession();
  if (session.role !== "MANAGER") {
    redirect("/login");
  }
  return session as SessionData & { role: "MANAGER"; name: string };
}
