"use client";
import { useEffect, useState, type FormEvent } from "react";

type Clip = { title: string; video_url: string; caption: string; hashtags: string[]; ai_score?: number };
type Job = { id: string; status: string; sourceUrl?: string; errorMessage?: string | null; clips: Clip[]; createdAt: string };

function statusLabel(status: string) {
  if (status === "queued") return "Queued";
  if (status === "running") return "Finding highlights and rendering";
  if (status === "succeeded") return "Ready";
  if (status === "failed") return "Needs attention";
  return status;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ClipStudio() {
  const [videoUrl, setVideoUrl] = useState("");
  const [prompt, setPrompt] = useState("Find the strongest self-contained moments. Start with an immediate hook and keep each clip focused on one complete idea.");
  const [count, setCount] = useState("3");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
      .catch(() => { if (alive) setMessage("Clipping status could not be loaded. Refresh the page to try again."); });
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
        if (data.job.status === "succeeded" || data.job.status === "failed") setActiveJobId(null);
      } catch {
        if (alive) setMessage("Progress check paused temporarily. Sorich Studio will keep the job saved; refresh to check again.");
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 8000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [activeJobId]);

  async function startClipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!rightsConfirmed) {
      setMessage("Please confirm that you own this video or have permission to edit it.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, prompt, numGenerations: Number(count), rightsConfirmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start clipping.");
      setJobs((current) => [data.job, ...current.filter((job) => job.id !== data.job.id)]);
      setActiveJobId(data.job.id);
      setVideoUrl("");
      setMessage("Clipping started. You can leave this page; the job is saved in your workspace.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start clipping.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card wide clip-studio" id="clipping">
      <div className="clip-heading">
        <div><span className="eyebrow">AI VIDEO WORKSHOP</span><h2>Turn a long video into Shorts</h2>
          <p className="muted">Paste a YouTube video link. Sorich finds highlights and creates vertical clips with subtitles, titles, captions and hashtags.</p>
        </div>
        <span className="badge">{configured === false ? "Setup needed" : "9:16 · Subtitles"}</span>
      </div>
      {configured === false && <p className="notice">The clipping engine is not connected yet. Add <code>REKA_API_KEY</code> to the Vercel Preview environment, then redeploy. The key stays on the server and is never sent to the browser.</p>}
      <form className="clip-form" onSubmit={startClipping}>
        <div className="field wide"><label htmlFor="clip-url">YouTube video URL</label>
          <input id="clip-url" type="url" required value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" disabled={busy || configured === false} />
        </div>
        <div className="field"><label htmlFor="clip-count">Number of clips</label>
          <select id="clip-count" value={count} onChange={(event) => setCount(event.target.value)} disabled={busy || configured === false}>
            <option value="1">1 clip</option><option value="2">2 clips</option><option value="3">3 clips</option>
          </select>
        </div>
        <div className="field wide"><label htmlFor="clip-prompt">What should the AI look for? (optional)</label>
          <textarea id="clip-prompt" rows={3} maxLength={500} value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={busy || configured === false} />
        </div>
        <label className="clip-rights"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} disabled={busy || configured === false} /> I own this video or have permission to make and use clips from it.</label>
        <div className="clip-submit"><button className="btn primary" disabled={busy || configured === false}>{busy ? "Starting…" : "✦ Generate clips"}</button><span className="muted">Up to 3 clips · 15–60 seconds · 720p</span></div>
      </form>
      {message && <p className="notice" role="status">{message}</p>}
      <div className="clip-jobs">
        {jobs.map((job) => <article className="clip-job" key={job.id}>
          <div className="clip-job-head"><div><b>{job.sourceUrl || "YouTube video"}</b><small>{new Date(job.createdAt).toLocaleString()}</small></div><span className={job.status === "failed" ? "badge red" : "badge"}>{statusLabel(job.status)}</span></div>
          {job.errorMessage && <p className="error">{job.errorMessage}</p>}
          {job.clips?.length > 0 && <div className="clip-results">{job.clips.map((clip, index) => <div className="clip-result" key={clip.video_url || index}>
            <video className="clip-video" controls playsInline preload="metadata" src={clip.video_url} />
            <div className="clip-result-body"><div className="clip-result-title"><b>{clip.title || `Clip ${index + 1}`}</b>{typeof clip.ai_score === "number" && <span className="badge">AI score {clip.ai_score}</span>}</div>
              <p>{clip.caption}</p><p className="clip-tags">{(clip.hashtags || []).join(" ")}</p>
              <div className="clip-actions"><a className="btn" href={clip.video_url} target="_blank" rel="noopener noreferrer">Open video ↗</a><button className="btn" type="button" onClick={() => copyText([clip.title, clip.caption, (clip.hashtags || []).join(" ")].filter(Boolean).join("\n\n"))}>Copy post details</button></div>
            </div>
          </div>)}</div>}
        </article>)}
      </div>
    </section>
  );
}
