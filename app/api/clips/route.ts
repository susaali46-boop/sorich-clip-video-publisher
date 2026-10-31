import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

const REKA_BASE = "https://vision-agent.api.reka.ai";
const MAX_PROMPT_LENGTH = 500;

function parseYouTubeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(host)) return null;
    const id = host.endsWith("youtu.be")
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : /^\/(shorts|live|embed)\/[^/]+$/.test(url.pathname)
          ? url.pathname.split("/")[2]
          : null;
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
    return host.endsWith("youtu.be") ? `https://youtu.be/${id}` : `https://www.youtube.com/watch?v=${id}`;
  } catch {
    return null;
  }
}

function safeClip(item: unknown) {
  if (!item || typeof item !== "object") return null;
  const value = item as Record<string, unknown>;
  let videoUrl = "";
  try {
    const parsed = new URL(String(value.video_url || ""));
    if (parsed.protocol !== "https:") return null;
    videoUrl = parsed.toString();
  } catch { return null; }
  const hashtags = Array.isArray(value.hashtags)
    ? value.hashtags.filter((tag): tag is string => typeof tag === "string").slice(0, 20).map((tag) => tag.slice(0, 60))
    : [];
  return {
    title: typeof value.title === "string" ? value.title.slice(0, 160) : "Generated clip",
    video_url: videoUrl,
    caption: typeof value.caption === "string" ? value.caption.slice(0, 2000) : "",
    hashtags,
    ai_score: typeof value.ai_score === "number" ? value.ai_score : undefined,
  };
}

function toJob(row: Record<string, unknown>) {
  const input = (row.input || {}) as Record<string, unknown>;
  const output = (row.output || {}) as Record<string, unknown>;
  return {
    id: row.id,
    status: row.status,
    sourceUrl: input.source_url || "",
    errorMessage: row.error_message || null,
    clips: Array.isArray(output.clips) ? output.clips : [],
    createdAt: row.created_at,
  };
}

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const workspaceId = await getWorkspaceId(db, user.id);
    const { data, error } = await db.from("generation_jobs")
      .select("id,status,input,output,error_message,created_at")
      .eq("workspace_id", workspaceId).eq("job_type", "clip_generation")
      .order("created_at", { ascending: false }).limit(10);
    if (error) return NextResponse.json({ error: "Could not load clipping jobs." }, { status: 500 });
    return NextResponse.json({ configured: Boolean(process.env.REKA_API_KEY), jobs: (data || []).map((row) => toJob(row)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Workspace access could not be verified." }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const apiKey = process.env.REKA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI clipping is not configured yet. The server is missing REKA_API_KEY." }, { status: 503 });

  const body = await req.json().catch(() => null) as { videoUrl?: unknown; prompt?: unknown; numGenerations?: unknown; rightsConfirmed?: unknown } | null;
  const sourceUrl = parseYouTubeUrl(body?.videoUrl);
  if (!sourceUrl) return NextResponse.json({ error: "Enter a valid YouTube video link (not a channel or playlist)." }, { status: 400 });
  if (body?.rightsConfirmed !== true) return NextResponse.json({ error: "Confirm that you own this video or have permission to edit it." }, { status: 400 });
  const numGenerations = Number(body?.numGenerations ?? 3);
  if (!Number.isInteger(numGenerations) || numGenerations < 1 || numGenerations > 3) return NextResponse.json({ error: "Choose between 1 and 3 clips." }, { status: 400 });
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : "";

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const workspaceId = await getWorkspaceId(db, user.id);
    const { data: active } = await db.from("generation_jobs").select("id")
      .eq("workspace_id", workspaceId).eq("job_type", "clip_generation")
      .in("status", ["queued", "running"]).limit(1).maybeSingle();
    if (active) return NextResponse.json({ error: "A clipping job is already running in this workspace. Wait for it to finish before starting another." }, { status: 409 });

    const { data: job, error: insertError } = await db.from("generation_jobs").insert({
      workspace_id: workspaceId, requested_by: user.id, job_type: "clip_generation",
      prompt: prompt || null, input: { provider: "reka", source_url: sourceUrl, num_generations: numGenerations },
      output: {}, status: "queued",
    }).select("id,status,input,output,error_message,created_at").single();
    if (insertError || !job) return NextResponse.json({ error: "Could not create a clipping job." }, { status: 500 });

    let providerResponse: Response;
    try {
      providerResponse = await fetch(`${REKA_BASE}/v1/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
        body: JSON.stringify({
          video_urls: [sourceUrl],
          prompt: prompt || "Create engaging short videos highlighting the strongest self-contained moments.",
          generation_config: { template: "moments", num_generations: numGenerations, min_duration_seconds: 15, max_duration_seconds: 60 },
          rendering_config: { subtitles: true, aspect_ratio: "9:16", resolution: 720 },
        }),
        signal: AbortSignal.timeout(25000),
        cache: "no-store",
      });
    } catch {
      await db.from("generation_jobs").update({ status: "failed", error_message: "The clipping provider could not be reached. Please try again." }).eq("id", job.id).eq("workspace_id", workspaceId);
      return NextResponse.json({ error: "The clipping provider could not be reached. Please try again." }, { status: 502 });
    }

    const providerData = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!providerResponse.ok || typeof providerData.id !== "string") {
      await db.from("generation_jobs").update({ status: "failed", error_message: "The clipping provider rejected this video or request." }).eq("id", job.id).eq("workspace_id", workspaceId);
      return NextResponse.json({ error: "The clipping provider rejected this video or request. Check the link and try another video." }, { status: 502 });
    }

    const nextStatus = providerData.status === "processing" ? "running" : "queued";
    const { data: updated, error: updateError } = await db.from("generation_jobs").update({
      status: nextStatus,
      input: { provider: "reka", provider_job_id: providerData.id, source_url: sourceUrl, num_generations: numGenerations },
      started_at: new Date().toISOString(),
    }).eq("id", job.id).eq("workspace_id", workspaceId).select("id,status,input,output,error_message,created_at").single();
    if (updateError || !updated) return NextResponse.json({ error: "The provider accepted the job, but Sorich could not save its tracking details. Contact support with the job ID." }, { status: 500 });
    return NextResponse.json({ job: toJob(updated) }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Workspace access could not be verified." }, { status: 403 });
  }
}
