import { NextRequest, NextResponse } from "next/server";
import { currentWorkspace } from "@/lib/oauth/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    await currentWorkspace(true);
    const response = NextResponse.json({ success: true });
    response.cookies.set("sorich_youtube_terms_v1", "accepted", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" ? 401 : message === "WORKSPACE_ADMIN_REQUIRED" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Sign in to continue." : status === 403 ? "Only workspace owners and admins can connect YouTube." : "Could not save your agreement." }, { status });
  }
}
