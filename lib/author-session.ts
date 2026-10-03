import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const cookieName = "memoir-author";
const sessionValue = "author";

function signature() {
  const secret = process.env.AUTHOR_SESSION_SECRET;
  if (!secret) throw new Error("AUTHOR_SESSION_SECRET is not configured.");
  return createHmac("sha256", secret).update(sessionValue).digest("hex");
}

export async function isAuthorSession() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;
  const expected = `${sessionValue}.${signature()}`;
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export { cookieName, sessionValue, signature };
