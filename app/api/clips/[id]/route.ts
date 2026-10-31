import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

const REKA_BASE = "https://vision-agent.api.reka.ai";

function safeClips(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const clip = item as Record<string, unknown>;
    try {
      const url = new URL(String(clip.video_url || ""));
      if (url.protocol !== "https:") return [];
      return [{
        title: typeof clip.title === "string" ? clip.title.slice(0, 160) : "Generated clip",
        video_url: url.toString(),
        caption: typeof clip.caption === "string" ? clip.caption.slice(0, 2000) : "",
        hashtags: Array.isArray(clip.hashtags) ? clip.hashtags.filter((tag): tag is string => typeof tag === "string").slice(0, 20).map((tag) => tag.slice(0, 60)) : [],
        ai_score: typeof clip.ai_score === "number" ? clip.ai_score : undefined,
      }];
    } catch { return []; }
  });
}

function toJob(row: Record<string, unknown>) {
  const input = (row.input || {}) as Record<string, unknown>;
  const output = (row.output || {}) as Record<string, unknown>;
  return { id: row.id, status: row.status, sourceUrl: input.source_url || "", errorMessage: row.error_message || null, clips: Array.isArray(output.clips) ? output.clips : [], createdAt: row.created_at };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid clipping job." }, { status: 400 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const workspaceId = await getWorkspaceId(db, user.id);
    const { data: job, error } = await db.from("generation_jobs")
      .select("id,workspace_id,job_type,status,input,output,error_message,created_at")
      .eq("id", id).eq("workspace_id", workspaceId).eq("job_type", "clip_generation").single();
    if (error || !job) return NextResponse.json({ error: "Clipping job not found." }, { status: 404 });
    if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") return NextResponse.json({ job: toJob(job) }, { headers: { "Cache-Control": "no-store" } });

    const apiKey = process.env.REKA_API_KEY;
    const input = (job.input || {}) as Record<string, unknown>;
    const providerJobId = input.provider_job_id;
    if (!apiKey || typeof providerJobId !== "string") return NextResponse.json({ error: "Clipping provider configuration is unavailable." }, { status: 503 });

    let providerResponse: Response;
    try {
      providerResponse = await fetch(`${REKA_BASE}/v1/clips/${encodeURIComponent(providerJobId)}`, {
        headers: { "X-Api-Key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(15000),
      });
    } catch {
      return NextResponse.json({ error: "The clipping provider is temporarily unavailable." }, { status: 502 });
    }
    if (!providerResponse.ok) return NextResponse.json({ error: "Could not check clipping progress right now." }, { status: 502 });
    const providerData = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
    const providerStatus = String(providerData.status || "");
    const updates: Record<string, unknown> = {};
    if (providerStatus === "completed") {
      const clips = safeClips(providerData.output);
      updates.status = "succeeded";
      updates.output = { clips, provider: "reka" };
      updates.completed_at = new Date().toISOString();
      updates.error_message = null;
    } else if (providerStatus === "failed") {
      updates.status = "failed";
      updates.error_message = typeof providerData.error_message === "string" ? providerData.error_message.slice(0, 500) : "The clipping provider could not finish this video.";
      updates.completed_at = new Date().toISOString();
    } else if (providerStatus === "processing") {
      updates.status = "running";
    } else {
      updates.status = "queued";
    }

    const { data: updated, error: updateError } = await db.from("generation_jobs").update(updates)
      .eq("id", job.id).eq("workspace_id", workspaceId)
      .select("id,status,input,output,error_message,created_at").single();
    if (updateError || !updated) return NextResponse.json({ error: "Could not save clipping progress." }, { status: 500 });
    return NextResponse.json({ job: toJob(updated) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Workspace access could not be verified." }, { status: 403 });
  }
}
