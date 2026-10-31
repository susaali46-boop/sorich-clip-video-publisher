import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

const allowed = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => null) as { filename?: string; mimeType?: string; size?: number } | null;
  if (!body?.filename?.trim() || !body.mimeType || !allowed.has(body.mimeType) || !Number.isInteger(body.size) || Number(body.size) <= 0 || Number(body.size) > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Unsupported file or file exceeds 100 MB." }, { status: 400 });
  }
  try {
    const workspace = await getWorkspaceId(db, user.id);
    const name = body.filename.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "video";
    const path = workspace + "/" + crypto.randomUUID() + "-" + name;
    const { data, error } = await db.storage.from("sorich-media").createSignedUploadUrl(path, { upsert: false });
    if (error || !data) return NextResponse.json({ error: "Could not create private upload URL." }, { status: 500 });
    return NextResponse.json({ signedUrl: data.signedUrl, path }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Workspace access could not be verified." }, { status: 403 });
  }
}
