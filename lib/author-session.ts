import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type Author = "sander" | "cristine";
const cookieName = "memoir-author";
function signature(author: Author) { const secret = process.env.AUTHOR_SESSION_SECRET; if (!secret) throw new Error("AUTHOR_SESSION_SECRET is not configured."); return createHmac("sha256", secret).update(author).digest("hex"); }
export async function authorSession(): Promise<Author | null> { const value = (await cookies()).get(cookieName)?.value; if (!value) return null; for (const author of ["sander", "cristine"] as const) { const expected = `${author}.${signature(author)}`; if (value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))) return author; } return null; }
export async function isAuthorSession() { return Boolean(await authorSession()); }
export { cookieName, signature };
