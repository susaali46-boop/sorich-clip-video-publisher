import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { signOut } from "@/app/auth/actions";
import { createPost, deletePost } from "@/app/dashboard/actions";
import { UploadForm } from "./upload-form";
import { ClipStudio } from "./clip-studio";
import { ConnectionsManager } from "./connections-manager";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const ws = await ensureWorkspace(db, user);
  const [assetsResult, postsResult, accountsResult, jobsResult] = await Promise.all([
    db.from("media_assets").select("id,original_filename,mime_type,size_bytes,status,created_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(30),
    db.from("publishing_posts").select("id,title,caption,status,scheduled_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(30),
    db.from("social_accounts").select("id,provider,status,account_name,account_handle").eq("workspace_id", ws.id),
    db.from("generation_jobs").select("id,status").eq("workspace_id", ws.id),
  ]);
  const assets = assetsResult.data || [];
  const posts = postsResult.data || [];
  const accounts = accountsResult.data || [];
  const jobs = jobsResult.data || [];
  const date = (value: string | null) => value ? new Date(value).toLocaleString() : "No date set";
  const errorMessage = error === "empty" ? "Add a title or caption before saving."
    : error === "save" ? "The draft could not be saved. Please try again."
    : error === "delete" ? "The draft could not be deleted. Please try again."
    : error ? "That action could not be completed. Please review the details and try again." : "";

  return <div className="app">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="mark">S</span><span>SORICH STUDIO</span></Link>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">
        <a className="active" href="#overview">⌂ <span>Overview</span></a>
        <a href="#library">▤ <span>Video library</span></a>
        <a href="#clipping">✦ <span>AI clipping</span></a>
        <a href="#composer">✎ <span>Post composer</span></a>
        <a href="#calendar">▦ <span>Publishing plan</span></a>
      </nav>
      <div className="side-label">MANAGE</div>
      <nav className="side-nav"><a href="#connections">↗ <span>Connections</span></a><a href="#settings">⚙ <span>Settings</span></a></nav>
      <div className="side-bottom"><b>{user.user_metadata?.display_name || user.email}</b><p className="muted">Private workspace</p></div>
    </aside>
    <div className="main">
      <header className="topbar"><span className="muted">Creator workspace / <b>Overview</b></span><form action={signOut}><button className="btn">Sign out ↗</button></form></header>
      <main className="content" id="overview">
        <div className="page-head"><div><span className="eyebrow">YOUR CREATOR STUDIO</span><h1>Welcome back, {user.user_metadata?.display_name || user.email?.split("@")[0] || "creator"}.</h1><p className="muted">{ws.name} · Your content workflow, all in one place.</p></div><a className="btn primary" href="#composer">＋ Create a post</a></div>
        {saved && <p className="notice">Draft saved successfully.</p>}
        {errorMessage && <p className="error">{errorMessage}</p>}
        <section className="grid-stats">
          {[[assets.length, "Videos in library"], [posts.length, "Post drafts"], [accounts.filter((item) => item.status === "connected").length, "Connected accounts"], [jobs.length, "AI jobs"]].map((item) => <article className="stat" key={item[1]}><span className="muted">{item[1]}</span><b>{item[0]}</b></article>)}
        </section>
        <div className="grid">
          <ClipStudio />
          <section className="card" id="library"><span className="eyebrow">YOUR CONTENT</span><h2>Video library</h2><p className="muted">Upload original video files to your private workspace.</p><UploadForm />
            {assets.length ? assets.map((item) => <div className="row" key={item.id}><div><b>{item.original_filename || "Untitled video"}</b><small>{item.mime_type} · {item.size_bytes ? Math.round(item.size_bytes / 1048576) + " MB" : "—"} · {date(item.created_at)}</small></div><span className="badge green">{item.status}</span></div>) : <p className="notice">Your library is empty. Upload a video to begin.</p>}
          </section>
          <ConnectionsManager />
          <section className="card wide" id="composer"><span className="eyebrow">PREPARE YOUR NEXT POST</span><h2>Post composer</h2><p className="muted">Save drafts and plan content. Nothing is automatically published.</p>
            <form action={createPost} className="composer"><div className="field wide"><label htmlFor="title">Post title</label><input id="title" name="title" maxLength={120} placeholder="A clear working title" /></div><div className="field wide"><label htmlFor="caption">Caption</label><textarea id="caption" name="caption" maxLength={5000} placeholder="Write your caption…" /></div><div className="field"><label htmlFor="hashtags">Hashtags</label><input id="hashtags" name="hashtags" placeholder="#creator #shorts" /></div><div className="field"><label htmlFor="planned_at">Planned date</label><input id="planned_at" name="planned_at" type="datetime-local" /></div><div className="wide"><button className="btn primary">Save draft</button></div></form>
          </section>
          <section className="card wide" id="calendar"><span className="eyebrow">CONTENT PIPELINE</span><h2>Publishing plan</h2><p className="muted">Saved drafts and intended dates. Nothing here is auto-published.</p><div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>POST</th><th>PLANNED FOR</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{posts.length ? posts.map((item) => <tr key={item.id}><td>{item.title || "Untitled draft"}</td><td>{date(item.scheduled_at)}</td><td><span className="badge">{item.status}</span></td><td><form action={deletePost}><input type="hidden" name="id" value={item.id} /><button className="btn">Delete</button></form></td></tr>) : <tr><td colSpan={4}>No drafts yet.</td></tr>}</tbody></table></div></section>
          <section className="card wide" id="settings"><span className="eyebrow">WORKSPACE SETTINGS</span><h2>{ws.name}</h2><p className="muted">Billing is not enabled. The application is being structured to support a future monthly plan without activating payments now.</p></section>
        </div>
        <footer className="footer">SORICH STUDIO · Private creator workspace · <Link href="/">Website</Link></footer>
      </main>
    </div>
  </div>;
}
