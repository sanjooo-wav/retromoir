import { NextResponse } from "next/server";
import { authorSession } from "@/lib/author-session";

const themes = ["apricot", "rose", "midnight", "meadow"] as const;
const paperStyles = ["lined", "plain"] as const;
type Theme = (typeof themes)[number];
type PaperStyle = (typeof paperStyles)[number];
type DatabaseLetter = { id: string; title: string; body: string; month: string; kind: "monthly" | "little"; author: "sander" | "cristine"; attachment_url: string | null; theme: Theme; paper_style: PaperStyle; sign_off: string | null; created_at: string };

function config() { const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY; if (!url || !key) throw new Error("Supabase is not configured."); return { url, key }; }
function headers(key: string) { return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }; }
function toLetter({ created_at, attachment_url, paper_style, sign_off, ...letter }: DatabaseLetter) { return { ...letter, attachmentUrl: attachment_url ?? undefined, paperStyle: paper_style ?? "lined", signOff: sign_off ?? undefined, createdAt: created_at }; }

export async function GET() {
  try {
    const { url, key } = config();
    const response = await fetch(`${url}/rest/v1/letters?select=id,title,body,month,kind,author,attachment_url,theme,paper_style,sign_off,created_at&order=created_at.desc`, { headers: headers(key), cache: "no-store" });
    if (!response.ok) throw new Error();
    return NextResponse.json((await response.json() as DatabaseLetter[]).map(toLetter));
  } catch { return NextResponse.json({ message: "Letters could not be loaded yet." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const author = await authorSession();
  if (!author) return NextResponse.json({ message: "A writer password is required." }, { status: 401 });
  const { title, body, kind, attachmentUrl, theme, paperStyle, signOff } = await request.json();
  if (typeof body !== "string" || !body.trim() || (kind !== "monthly" && kind !== "little")) return NextResponse.json({ message: "A letter needs a message and a valid type." }, { status: 400 });
  if (theme !== undefined && !themes.includes(theme)) return NextResponse.json({ message: "Choose one of the stationery themes." }, { status: 400 });
  if (paperStyle !== undefined && !paperStyles.includes(paperStyle)) return NextResponse.json({ message: "Choose a valid paper style." }, { status: 400 });
  if (signOff !== undefined && (typeof signOff !== "string" || signOff.length > 100)) return NextResponse.json({ message: "Your sign-off can be up to 100 characters." }, { status: 400 });
  try {
    const { url, key } = config();
    const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const response = await fetch(`${url}/rest/v1/letters`, { method: "POST", headers: { ...headers(key), Prefer: "return=representation" }, body: JSON.stringify({ title: typeof title === "string" && title.trim() ? title.trim() : kind === "monthly" ? "This month, for you" : "A little note", body: body.trim(), kind, author, month, attachment_url: typeof attachmentUrl === "string" ? attachmentUrl : null, theme: theme ?? "apricot", paper_style: paperStyle ?? "lined", sign_off: typeof signOff === "string" && signOff.trim() ? signOff.trim() : null }) });
    if (!response.ok) throw new Error();
    const [row] = await response.json() as DatabaseLetter[];
    return NextResponse.json(toLetter(row), { status: 201 });
  } catch { return NextResponse.json({ message: "Your letter could not be saved." }, { status: 500 }); }
}
