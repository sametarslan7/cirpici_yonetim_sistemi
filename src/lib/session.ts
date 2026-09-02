import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";

export type SessionData = {
  employeeId?: string;
  name?: string;
  role?: "MANAGER" | "VETERAN";
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

/** Sadece yönetici (Mahsum hoca) erişimi için. */
export async function requireManager() {
  const session = await requireSession();
  if (session.role !== "MANAGER") {
    redirect("/login");
  }
  return session as SessionData & { role: "MANAGER"; name: string };
}
