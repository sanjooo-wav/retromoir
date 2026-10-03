import { NextResponse } from "next/server";
import { isAuthorSession } from "@/lib/author-session";

type DatabaseLetter = { id: string; title: string; body: string; month: string; kind: "monthly" | "little"; created_at: string };

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function GET() {
  try {
    const { url, key } = config();
    const response = await fetch(`${url}/rest/v1/letters?select=id,title,body,month,kind,created_at&order=created_at.desc`, { headers: headers(key), cache: "no-store" });
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json() as DatabaseLetter[];
    return NextResponse.json(rows.map(({ created_at, ...letter }) => ({ ...letter, createdAt: created_at })));
  } catch {
    return NextResponse.json({ message: "Letters could not be loaded yet." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await isAuthorSession()) return NextResponse.json({ message: "Author access is required." }, { status: 401 });
  const { title, body, kind } = await request.json();
  if (typeof body !== "string" || !body.trim() || (kind !== "monthly" && kind !== "little")) return NextResponse.json({ message: "A letter needs a message and a valid type." }, { status: 400 });
  try {
    const { url, key } = config();
    const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const response = await fetch(`${url}/rest/v1/letters`, { method: "POST", headers: { ...headers(key), Prefer: "return=representation" }, body: JSON.stringify({ title: typeof title === "string" && title.trim() ? title.trim() : kind === "monthly" ? "This month, for you" : "A little note", body: body.trim(), kind, month }) });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as DatabaseLetter[];
    return NextResponse.json({ id: row.id, title: row.title, body: row.body, month: row.month, kind: row.kind, createdAt: row.created_at }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Your letter could not be saved." }, { status: 500 });
  }
}
