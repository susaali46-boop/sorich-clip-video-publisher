"use client";
import { useState } from "react";
import Link from "next/link";

export default function YouTubeConsentPage() {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function continueToGoogle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/youtube/consent", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your consent.");
      window.location.assign("/api/oauth/youtube");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your consent.");
      setBusy(false);
    }
  }
  return <main className="container" style={{ maxWidth: 720, padding: "64px 24px" }}>
    <Link href="/" className="brand">SORICH STUDIO</Link>
    <p className="eyebrow">YOUTUBE ACCOUNT CONNECTION</p>
    <h1>Before connecting your channel</h1>
    <p className="muted">Sorich Studio uses YouTube API Services to identify your connected channel and, when you explicitly approve, upload a video and check its processing status.</p>
    <div className="card" style={{ margin: "24px 0" }}>
      <h2>What you authorize</h2>
      <ul>
        <li>Basic Google account identity to associate the connection with a channel.</li>
        <li>YouTube channel read access to identify your channel.</li>
        <li>YouTube upload access to publish a video only after you select it, review the details and approve the upload.</li>
      </ul>
      <p>OAuth tokens are encrypted on the server. Sorich Studio does not sell Google data or use it for targeted advertising or generalized AI model training.</p>
      <p>Read the <a href="/privacy-policy.html">Privacy Policy</a>, <a href="/terms.html">Terms of Service</a>, <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p>
    </div>
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
      <span>I have read the linked policies and agree to the YouTube Terms of Service and Sorich Studio Terms and Privacy Policy.</span>
    </label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="btn primary" type="button" disabled={!accepted || busy} onClick={continueToGoogle} style={{ marginTop: 20 }}>{busy ? "Continuing…" : "Agree and continue to Google"}</button>
  </main>;
}
