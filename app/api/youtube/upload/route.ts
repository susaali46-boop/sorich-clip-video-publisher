import { NextRequest, NextResponse } from "next/server";
import {
  currentWorkspace,
  loadCredential,
  saveRefreshedCredential,
} from "@/lib/oauth/security";
import { refreshProviderToken, tokenExpiry } from "@/lib/oauth/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 100 * 1024 * 1024;
const MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return jsonError("Invalid request origin.", 403);

  let postId: string | null = null;
  try {
    const { db, user, workspaceId } = await currentWorkspace(true);
    const body = await request.json().catch(() => null) as {
      assetId?: string;
      accountId?: string;
      title?: string;
      description?: string;
      tags?: string;
      privacyStatus?: string;
      madeForKids?: boolean;
      rightsConfirmed?: boolean;
      termsAccepted?: boolean;
    } | null;

    if (!body || typeof body.assetId !== "string" || typeof body.accountId !== "string") {
      return jsonError("Choose a video and a connected YouTube channel.", 400);
    }
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const privacyStatus = body.privacyStatus || "private";
    if (!title || title.length > 100) return jsonError("Title is required and must be 100 characters or fewer.", 400);
    if (description.length > 5000) return jsonError("Description must be 5,000 characters or fewer.", 400);
    if (!["private", "unlisted", "public"].includes(privacyStatus)) return jsonError("Choose a valid visibility setting.", 400);
    if (typeof body.madeForKids !== "boolean") return jsonError("Confirm whether this video is made for children.", 400);
    if (body.rightsConfirmed !== true) return jsonError("Confirm that you have the rights to upload this video.", 400);
    if (body.termsAccepted !== true) return jsonError("Review and accept the YouTube and Sorich Studio terms before uploading.", 400);

    const { data: asset, error: assetError } = await db.from("media_assets")
      .select("id,workspace_id,storage_bucket,storage_path,original_filename,mime_type,size_bytes,status")
      .eq("id", body.assetId).eq("workspace_id", workspaceId).eq("status", "ready").single();
    if (assetError || !asset) return jsonError("That video is not available in this workspace. Upload it to your private library first.", 404);
    if (!asset.mime_type || !MIME_TYPES.has(asset.mime_type) || !asset.size_bytes || asset.size_bytes > MAX_BYTES) {
      return jsonError("The selected video must be MP4, MOV or WebM and no larger than 100 MB.", 400);
    }

    const { data: account, error: accountError } = await db.from("social_accounts")
      .select("id,provider,provider_account_id,account_name,scopes,status")
      .eq("id", body.accountId).eq("workspace_id", workspaceId)
      .eq("provider", "youtube").eq("status", "connected").single();
    if (accountError || !account) return jsonError("Connect a YouTube channel before uploading.", 404);
    if (!Array.isArray(account.scopes) || !account.scopes.includes(UPLOAD_SCOPE)) {
      return jsonError("This YouTube connection does not include upload permission. Disconnect it and reconnect, approving the YouTube upload permission.", 403);
    }

    const tags = typeof body.tags === "string"
      ? body.tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 30)
      : [];
    if (tags.join("").length > 500) return jsonError("Combined tags must be 500 characters or fewer.", 400);

    const { data: post, error: postError } = await db.from("publishing_posts").insert({
      workspace_id: workspaceId,
      media_asset_id: asset.id,
      social_account_id: account.id,
      created_by: user.id,
      title,
      caption: description,
      hashtags: tags,
      status: "uploading",
      provider_response: {
        provider: "youtube",
        privacyStatus,
        selfDeclaredMadeForKids: body.madeForKids,
        rightsConfirmedAt: new Date().toISOString(),
        termsAcceptedAt: new Date().toISOString(),
      },
    }).select("id").single();
    if (postError || !post) return jsonError("Could not create the upload record. Please retry.", 500);
    postId = post.id;

    const credential = await loadCredential(account.id, workspaceId);
    let tokens = credential.tokens;
    const expiresSoon = credential.row.token_expires_at
      ? new Date(credential.row.token_expires_at).getTime() < Date.now() + 120_000
      : false;
    if (expiresSoon) {
      const refreshed = await refreshProviderToken("youtube", tokens);
      tokens = refreshed;
      const expiry = tokenExpiry(refreshed.expiresIn);
      await saveRefreshedCredential(
        credential.admin,
        { social_account_id: account.id, workspace_id: workspaceId },
        refreshed,
        expiry,
        tokenExpiry(refreshed.refreshExpiresIn),
      );
      await db.from("social_accounts").update({ token_expires_at: expiry, updated_at: new Date().toISOString() })
        .eq("id", account.id).eq("workspace_id", workspaceId);
    }

    const admin = credential.admin;
    const { data: file, error: fileError } = await admin.storage.from(asset.storage_bucket).download(asset.storage_path);
    if (fileError || !file) throw new Error("The private source video could not be read from storage.");
    if (file.size !== Number(asset.size_bytes)) throw new Error("The stored video size does not match its library record.");

    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId: "22",
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: body.madeForKids,
      },
    };
    const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
    initUrl.searchParams.set("uploadType", "resumable");
    initUrl.searchParams.set("part", "snippet,status");
    const init = await fetch(initUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(file.size),
        "X-Upload-Content-Type": asset.mime_type,
      },
      body: JSON.stringify(metadata),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!init.ok) {
      const detail = await init.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(detail.error?.message || `YouTube could not start the upload (HTTP ${init.status}).`);
    }
    const uploadUri = init.headers.get("location");
    if (!uploadUri) throw new Error("YouTube did not return a resumable upload address.");
    const parsedUploadUri = new URL(uploadUri);
    if (parsedUploadUri.protocol !== "https:" || parsedUploadUri.hostname !== "www.googleapis.com" || !parsedUploadUri.pathname.startsWith("/upload/youtube/v3/videos")) {
      throw new Error("YouTube returned an unexpected upload address.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await fetch(uploadUri, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": asset.mime_type,
        "Content-Length": String(bytes.byteLength),
      },
      body: bytes,
      signal: AbortSignal.timeout(240_000),
      cache: "no-store",
    });
    const result = await uploaded.json().catch(() => ({})) as {
      id?: string;
      snippet?: { title?: string };
      status?: { uploadStatus?: string; privacyStatus?: string; selfDeclaredMadeForKids?: boolean };
      error?: { message?: string };
    };
    if (!uploaded.ok || !result.id) {
      throw new Error(result.error?.message || `YouTube upload failed (HTTP ${uploaded.status}).`);
    }

    await db.from("publishing_posts").update({
      status: "published",
      provider_post_id: result.id,
      published_at: new Date().toISOString(),
      provider_response: {
        provider: "youtube",
        videoId: result.id,
        uploadStatus: result.status?.uploadStatus || "uploaded",
        privacyStatus: result.status?.privacyStatus || privacyStatus,
        selfDeclaredMadeForKids: body.madeForKids,
      },
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", post.id).eq("workspace_id", workspaceId);

    return NextResponse.json({
      success: true,
      postId: post.id,
      videoId: result.id,
      title: result.snippet?.title || title,
      privacyStatus: result.status?.privacyStatus || privacyStatus,
      videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(result.id)}`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (postId) {
      try {
        const { db, workspaceId } = await currentWorkspace(true);
        await db.from("publishing_posts").update({
          status: "failed",
          error_message: (error instanceof Error ? error.message : "Upload failed.").slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", postId).eq("workspace_id", workspaceId);
      } catch { /* Keep the original failure response. */ }
    }
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" ? 401
      : message === "WORKSPACE_ADMIN_REQUIRED" ? 403
      : 400;
    return jsonError(
      status === 401 ? "Sign in to upload." :
      status === 403 ? "Only workspace owners and admins can publish." :
      (message || "The upload could not be completed."),
      status,
    );
  }
}
