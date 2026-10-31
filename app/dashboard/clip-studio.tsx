"use client";
import { useEffect, useState, type FormEvent } from "react";

type Clip = { title: string; video_url: string; caption: string; hashtags: string[]; ai_score?: number };
type Job = { id: string; status: string; sourceUrl?: string; errorMessage?: string | null; clips: Clip[]; createdAt: string };
type Preset = "balanced" | "podcast" | "education" | "story" | "comedy";

const PRESETS: Record<Preset, { label: string; prompt: string }> = {
  balanced: { label: "Best moments", prompt: "Find the strongest self-contained moments. Start with an immediate hook and keep each clip focused on one complete idea." },
  podcast: { label: "Podcast highlights", prompt: "Find compelling podcast moments with a strong opening hook, clear point of view, emotional reactions, useful insights, or memorable exchanges. Keep enough context for each clip to make sense on its own." },
  education: { label: "Educational takeaways", prompt: "Find the clearest useful lessons, surprising facts, practical tips, and concise explanations. Each clip should teach one complete takeaway and open with the value to the viewer." },
  story: { label: "Storytelling", prompt: "Find complete story beats with an intriguing setup, a clear progression, and a satisfying reveal or payoff. Avoid clips that begin or end mid-thought." },
  comedy: { label: "Funny moments", prompt: "Find the funniest self-contained moments, surprising reactions, witty exchanges, and strong punchlines. Preserve the setup so the moment makes sense." },
};

function statusLabel(status: string) {
  if (status === "queued") return "In queue";
  if (status === "running") return "Finding highlights and rendering";
  if (status === "succeeded") return "Ready to review";
  if (status === "failed") return "Needs attention";
  return status;
}

export function ClipStudio() {
  const [videoUrl, setVideoUrl] = useState("");
  const [preset, setPreset] = useState<Preset>("balanced");
  const [prompt, setPrompt] = useState(PRESETS.balanced.prompt);
  const [count, setCount] = useState("3");
  const [duration, setDuration] = useState("60");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("720");
  const [captionFont, setCaptionFont] = useState("BebasNeue");
  const [captionPosition, setCaptionPosition] = useState("bottom");
  const [captionHighlightColor, setCaptionHighlightColor] = useState("#7C5CFC");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/clips", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load clipping jobs.");
        if (!alive) return;
        setConfigured(Boolean(data.configured));
        setJobs(data.jobs || []);
        const active = (data.jobs || []).find((job: Job) => job.status === "queued" || job.status === "running");
        if (active) setActiveJobId(active.id);
      })
      .catch(() => { if (alive) { setMessage("Clipping status could not be loaded. Refresh the page to try again."); setMessageIsError(true); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!activeJobId) return;
    let alive = true;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/clips/${activeJobId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check clipping progress.");
        if (!alive) return;
        setJobs((current) => [data.job, ...current.filter((job) => job.id !== data.job.id)]);
        if (["succeeded", "failed", "cancelled"].includes(data.job.status)) setActiveJobId(null);
      } catch {
        if (alive) { setMessage("Progress check paused temporarily. Your job remains saved; refresh to check again."); setMessageIsError(true); }
      } finally { inFlight = false; }
    };
    void poll();
    const timer = window.setInterval(poll, 8000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [activeJobId]);

  function choosePreset(value: Preset) {
    setPreset(value);
    setPrompt(PRESETS[value].prompt);
  }

  async function startClipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageIsError(false);
    if (!rightsConfirmed) { setMessage("Please confirm that you own this video or have permission to edit it."); setMessageIsError(true); return; }
    if (configured !== true) { setMessage("AI clipping is not connected yet. The workspace needs the server-side REKA_API_KEY before clips can be generated. Your output settings are saved in this form and can be selected now."); setMessageIsError(true); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, prompt, numGenerations: Number(count), maxDurationSeconds: Number(duration), aspectRatio, resolution: Number(resolution), captionFont, captionPosition, captionHighlightColor, rightsConfirmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start clipping.");
      setJobs((current) => [data.job, ...current.filter((job) => job.id !== data.job.id)]);
      setActiveJobId(data.job.id);
      setVideoUrl("");
      setMessage("Your clip job has started and is saved in this workspace. You can leave this page and return later.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start clipping.");
      setMessageIsError(true);
    } finally { setBusy(false); }
  }

  async function copyPostDetails(clip: Clip) {
    const content = [clip.title, clip.caption, (clip.hashtags || []).join(" ")].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(content);
      setMessage("Post details copied."); setMessageIsError(false);
    } catch {
      setMessage("Clipboard access was blocked by this browser. Select and copy the post text instead."); setMessageIsError(true);
    }
  }

  return (
    <section className="card wide clip-studio" id="clipping">
      <div className="clip-heading">
        <div><span className="eyebrow">AI VIDEO WORKSHOP</span><h2>Turn one long video into a batch of Shorts</h2>
          <p className="muted">Choose the moments, format and caption look. Review every result before using it anywhere.</p>
        </div>
        <span className={`badge ${configured === false ? "red" : "green"}`}>{configured === null ? "Checking engine…" : configured ? "AI engine connected" : "Setup needed"}</span>
      </div>
      {configured === false && <p className="notice">The clipping engine is not connected yet. Add <code>REKA_API_KEY</code> to the Vercel Preview environment, then redeploy. The key stays on the server and is never sent to the browser.</p>}
      <form className="clip-form" onSubmit={startClipping}>
        <div className="field wide"><label htmlFor="clip-url">Source YouTube video</label>
          <input id="clip-url" type="url" required value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Paste a YouTube video link" disabled={busy} />
          <small>Use a video you own or have permission to edit. Channel and playlist links are not supported.</small>
        </div>
        <div className="field"><label htmlFor="clip-preset">Creative direction</label>
          <select id="clip-preset" value={preset} onChange={(event) => choosePreset(event.target.value as Preset)} disabled={busy}>
            {Object.entries(PRESETS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="clip-count">Number of clips</label>
          <select id="clip-count" value={count} onChange={(event) => setCount(event.target.value)} disabled={busy}>
            <option value="1">1 clip</option><option value="2">2 clips</option><option value="3">3 clips</option>
          </select>
        </div>
        <div className="field wide"><label htmlFor="clip-prompt">Fine-tune the AI brief</label>
          <textarea id="clip-prompt" rows={3} maxLength={500} value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={busy} />
          <small>{prompt.length}/500 characters · Tell the AI which topics, moments or audience to prioritize.</small>
        </div>
        <div className="clip-options-heading"><span className="eyebrow">OUTPUT SETTINGS</span><span className="muted">Customize each generated clip</span></div>
        <div className="field"><label htmlFor="clip-duration">Maximum clip length</label>
          <select id="clip-duration" value={duration} onChange={(event) => setDuration(event.target.value)} disabled={busy}>
            <option value="15">Up to 15 seconds</option><option value="30">Up to 30 seconds</option><option value="45">Up to 45 seconds</option><option value="60">Up to 60 seconds</option>
          </select>
        </div>
        <div className="field"><label htmlFor="clip-ratio">Video format</label>
          <select id="clip-ratio" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} disabled={busy}>
            <option value="9:16">9:16 · Shorts / Reels / TikTok</option><option value="9:16-split">9:16 split screen</option><option value="4:5">4:5 · Portrait feed</option><option value="1:1">1:1 · Square</option><option value="16:9">16:9 · Landscape</option>
          </select>
        </div>
        <div className="field"><label htmlFor="clip-resolution">Resolution</label>
          <select id="clip-resolution" value={resolution} onChange={(event) => setResolution(event.target.value)} disabled={busy}>
            <option value="720">720p · Standard</option><option value="1080">1080p · HD (may cost more)</option>
          </select>
        </div>
        <div className="field"><label htmlFor="clip-font">Caption font</label>
          <select id="clip-font" value={captionFont} onChange={(event) => setCaptionFont(event.target.value)} disabled={busy}>
            <option value="BebasNeue">Bebas Neue · Bold</option><option value="RobotoCondensed">Roboto Condensed</option><option value="Lato">Lato · Clean</option><option value="Bangers">Bangers · Expressive</option><option value="CaptionFont">Caption Font</option>
          </select>
        </div>
        <div className="field"><label htmlFor="clip-caption-position">Caption placement</label>
          <select id="clip-caption-position" value={captionPosition} onChange={(event) => setCaptionPosition(event.target.value)} disabled={busy}>
            <option value="bottom">Bottom</option><option value="middle">Middle</option><option value="top">Top</option>
          </select>
        </div>
        <div className="field clip-color-field"><label htmlFor="clip-caption-color">Caption highlight color</label>
          <div className="color-control"><input id="clip-caption-color" type="color" value={captionHighlightColor} onChange={(event) => setCaptionHighlightColor(event.target.value)} disabled={busy} /><span>{captionHighlightColor.toUpperCase()}</span></div>
        </div>
        <label className="clip-rights"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} disabled={busy} /> I own this video or have permission to make and use clips from it.</label>
        <div className="clip-submit"><button className="btn primary" disabled={busy}>{busy ? "Starting…" : "✦ Generate clips"}</button><span className="muted">1–3 clips · Subtitles included · Review before publishing</span></div>
      </form>
      {message && <p className={messageIsError ? "error" : "notice"} role={messageIsError ? "alert" : "status"}>{message}</p>}
      <div className="clip-jobs">
        {jobs.map((job) => <article className="clip-job" key={job.id}>
          <div className="clip-job-head"><div><b>{job.sourceUrl || "YouTube video"}</b><small>{new Date(job.createdAt).toLocaleString()}</small></div><span className={job.status === "failed" ? "badge red" : job.status === "succeeded" ? "badge green" : "badge"}>{statusLabel(job.status)}</span></div>
          {job.errorMessage && <p className="error">{job.errorMessage}</p>}
          {job.status === "queued" || job.status === "running" ? <p className="clip-progress" role="status">Your video is being processed. This can take a few minutes.</p> : null}
          {job.clips?.length > 0 && <div className="clip-results">{job.clips.map((clip, index) => <div className="clip-result" key={clip.video_url || index}>
            <video className="clip-video" controls playsInline preload="metadata" src={clip.video_url} />
            <div className="clip-result-body"><div className="clip-result-title"><b>{clip.title || `Clip ${index + 1}`}</b>{typeof clip.ai_score === "number" && <span className="badge">AI score {clip.ai_score}</span>}</div>
              <p>{clip.caption}</p><p className="clip-tags">{(clip.hashtags || []).join(" ")}</p>
              <div className="clip-actions"><a className="btn" href={clip.video_url} target="_blank" rel="noopener noreferrer">Open video ↗</a><a className="btn" href={clip.video_url} download>Download clip ↓</a><button className="btn" type="button" onClick={() => void copyPostDetails(clip)}>Copy post details</button></div>
            </div>
          </div>)}</div>}
        </article>)}
      </div>
    </section>
  );
}
