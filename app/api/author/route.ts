import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { authorSession, cookieName, signature, type Author } from "@/lib/author-session";
function matches(value: string, expected?: string) { return Boolean(expected && value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))); }
export async function GET() { return NextResponse.json({ author: await authorSession() }); }
export async function POST(request: Request) { const { password } = await request.json(); if (typeof password !== "string") return NextResponse.json({ author: null, message: "That password did not match." }, { status: 401 }); const author: Author | null = matches(password, process.env.AUTHOR_PASSWORD) ? "sander" : matches(password, process.env.CRISTINE_PASSWORD) ? "cristine" : null; if (!author) return NextResponse.json({ author: null, message: "That password did not match." }, { status: 401 }); const response = NextResponse.json({ author }); response.cookies.set(cookieName, `${author}.${signature(author)}`, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 }); return response; }
export async function DELETE() { const response = NextResponse.json({ author: null }); response.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 }); return response; }
