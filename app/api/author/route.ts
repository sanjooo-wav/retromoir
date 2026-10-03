import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { cookieName, isAuthorSession, sessionValue, signature } from "@/lib/author-session";

export async function GET() {
  return NextResponse.json({ author: await isAuthorSession() });
}

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.AUTHOR_PASSWORD;
  if (!expected || typeof password !== "string" || password.length !== expected.length || !timingSafeEqual(Buffer.from(password), Buffer.from(expected))) {
    return NextResponse.json({ author: false, message: "That password did not match." }, { status: 401 });
  }
  const response = NextResponse.json({ author: true });
  response.cookies.set(cookieName, `${sessionValue}.${signature()}`, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ author: false });
  response.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
