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
  const body = await req.json().catch(() => null) as { path?: string; filename?: string; mimeType?: string; size?: number } | null;
  if (!body || typeof body.path !== "string" || !body.path || typeof body.filename !== "string" || !body.filename.trim() ||
      typeof body.mimeType !== "string" || !allowed.has(body.mimeType) || !Number.isInteger(body.size) ||
      Number(body.size) <= 0 || Number(body.size) > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Invalid upload metadata." }, { status: 400 });
  }
  const filename = body.filename.trim().slice(0, 255);
  const size = Number(body.size);
  try {
    const workspace = await getWorkspaceId(db, user.id);
    const pathParts = body.path.split("/");
    if (pathParts.length !== 2 || pathParts[0] !== workspace || pathParts[1].includes("..")) return NextResponse.json({ error: "Invalid storage path." }, { status: 403 });
    const basename = pathParts[1];
    const { data: objects, error: listError } = await db.storage.from("sorich-media").list(workspace, { search: basename, limit: 5 });
    const uploaded = objects?.find((item) => item.name === basename);
    if (listError || !uploaded) return NextResponse.json({ error: "Uploaded file was not found." }, { status: 400 });
    const actualSize = Number(uploaded.metadata?.size || uploaded.metadata?.contentLength || 0);
    if (actualSize && actualSize !== size) return NextResponse.json({ error: "Uploaded file size does not match the submitted metadata." }, { status: 400 });
    const { data, error } = await db.from("media_assets").insert({
      workspace_id: workspace, uploaded_by: user.id, storage_bucket: "sorich-media", storage_path: body.path,
      original_filename: filename, mime_type: body.mimeType, size_bytes: size, status: "ready",
    }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Could not save media record." }, { status: 500 });
    return NextResponse.json({ id: data.id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Workspace access could not be verified." }, { status: 403 });
  }
}
