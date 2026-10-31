"use client";

import { useCallback, useEffect, useState } from "react";

type Asset = { id: string; original_filename: string | null; mime_type: string | null; size_bytes: number | null; created_at: string };
type Account = { id: string; provider_account_id: string; account_name: string | null; account_handle: string | null; scopes: string[] };
type UploadResult = { videoId: string; videoUrl: string; title: string; privacyStatus: string };
type VideoStatus = { uploadStatus: string; processingStatus: string; privacyStatus: string; videoUrl: string };

export function YouTubePublisher() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assetId, setAssetId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("private");
  const [madeForKids, setMadeForKids] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [status, setStatus] = useState<VideoStatus | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/youtube/options", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load videos and channels.");
      setAssets(data.assets || []);
      setAccounts(data.accounts || []);
      if (!assetId && data.assets?.length) setAssetId(data.assets[0].id);
      if (!accountId && data.accounts?.length) setAccountId(data.accounts[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load publishing options.");
    } finally {
      setLoading(false);
    }
  }, [assetId, accountId]);

  useEffect(() => { void loadOptions(); }, [loadOptions]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId || !accountId || !title.trim() || madeForKids === "" || !rightsConfirmed || !termsAccepted) {
      setMessage("Complete every required field and confirmation before uploading.");
      return;
    }
    if (!window.confirm("Upload this video to the selected YouTube channel now? The upload will use the visibility setting shown above.")) return;
    setBusy(true);
    setMessage("Uploading to YouTube. Keep this page open until the upload finishes.");
    setResult(null);
    setStatus(null);
    try {
      const response = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId, accountId, title, description, tags, privacyStatus,
          madeForKids: madeForKids === "yes",
          rightsConfirmed, termsAccepted,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The YouTube upload failed.");
      setResult(data);
      setMessage("YouTube accepted the video upload.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The upload could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    if (!result || !accountId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/youtube/videos/${encodeURIComponent(result.videoId)}?accountId=${encodeURIComponent(accountId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not retrieve YouTube status.");
      setStatus(data);
      setMessage("Latest status retrieved from YouTube.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check upload status.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card wide" id="youtube-publisher">
    <span className="eyebrow">YOUTUBE API WORKFLOW</span>
    <h2>Review and publish a video</h2>
    <p className="muted">Choose a video already stored in your private library, review its details, then approve the upload. Nothing is sent to YouTube until you press the upload button and confirm.</p>
    {message && <p className="notice" role="status">{message}</p>}
    {loading ? <p className="muted">Loading your library and connected channels…</p> : <>
      {accounts.length === 0 ? <div className="notice"><b>No YouTube channel connected.</b><p>Connect your channel first in <a href="/dashboard#connections">Social connections</a>. The connection must include YouTube upload permission.</p><button className="btn primary" type="button" onClick={() => window.location.assign("/api/oauth/youtube")}>Connect YouTube</button></div> : null}
      {assets.length === 0 ? <div className="notice"><b>Your private video library is empty.</b><p>Upload an original MP4, MOV or WebM file in the Video library section first.</p><a className="btn" href="/dashboard#library">Open video library</a></div> : null}
      {accounts.length > 0 && assets.length > 0 ? <form className="composer" onSubmit={submit}>
        <div className="field wide"><label htmlFor="yt-account">YouTube channel</label><select id="yt-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>{accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name || account.provider_account_id} {account.account_handle ? `· ${account.account_handle}` : ""}</option>)}</select></div>
        <div className="field wide"><label htmlFor="yt-asset">Source video from private library</label><select id="yt-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename || "Untitled video"} · {asset.size_bytes ? (asset.size_bytes / 1048576).toFixed(1) + " MB" : "Size unknown"}</option>)}</select></div>
        <div className="field wide"><label htmlFor="yt-title">Video title (required, max 100 characters)</label><input id="yt-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required placeholder="Enter the title viewers will see" /></div>
        <div className="field wide"><label htmlFor="yt-description">Description (max 5,000 characters)</label><textarea id="yt-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder="Describe the video and include relevant links or credits." /></div>
        <div className="field wide"><label htmlFor="yt-tags">Tags (comma-separated, optional)</label><input id="yt-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="shorts, education, facts" /></div>
        <div className="field"><label htmlFor="yt-privacy">Visibility</label><select id="yt-privacy" value={privacyStatus} onChange={(e) => setPrivacyStatus(e.target.value)}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></div>
        <div className="field"><label htmlFor="yt-kids">Is this video made for children?</label><select id="yt-kids" value={madeForKids} onChange={(e) => setMadeForKids(e.target.value)} required><option value="">Choose one</option><option value="yes">Yes, made for children</option><option value="no">No, not made for children</option></select></div>
        <div className="field wide"><label><input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} /> I own this video or have all rights and permissions needed to upload it.</label></div>
        <div className="field wide"><label><input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} /> I have read and agree to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms of Service</a> and Sorich Studio <a href="/terms.html" target="_blank">Terms</a> and <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>.</label></div>
        <div className="wide"><button className="btn primary" type="submit" disabled={busy || !rightsConfirmed || !termsAccepted || madeForKids === ""}>{busy ? "Working…" : "Review confirmed — upload to YouTube"}</button></div>
      </form> : null}
    </>}
    {result && <div className="notice" style={{ marginTop: 20 }}>
      <b>Upload accepted by YouTube</b>
      <p>{result.title} · Visibility: {result.privacyStatus}</p>
      <p><a href={result.videoUrl} target="_blank" rel="noreferrer">Open video on YouTube</a></p>
      <button type="button" className="btn" onClick={checkStatus} disabled={busy}>Check YouTube processing status</button>
      {status && <p>Upload: {status.uploadStatus} · Processing: {status.processingStatus} · Visibility: {status.privacyStatus}</p>}
    </div>}
    <p className="oauth-security-note">Uploads are made server-side using your authorized channel connection. The browser never receives your OAuth access token or client secret. A YouTube upload can take time; do not close the page until the request finishes.</p>
  </section>;
}
