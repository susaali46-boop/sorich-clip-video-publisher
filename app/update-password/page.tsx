import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";

export default async function UpdatePassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const messages: Record<string, string> = {
    weak: "Choose a password with at least 12 characters.",
    mismatch: "The passwords do not match.",
    failed: "The password could not be updated. Request a new reset link and try again.",
  };
  return (
    <main className="auth">
      <section className="auth-copy">
        <Link className="brand" href="/"><span className="mark">S</span>SORICH STUDIO</Link>
        <h1>A fresh start for your creator workspace.</h1>
        <p>Choose a new password to secure your account.</p>
      </section>
      <section className="auth-card">
        <h2>Choose a new password</h2>
        <p className="muted">Use at least 12 characters.</p>
        {error && <p className="error" role="alert">{messages[error] || "Your reset session may have expired. Request a new link."}</p>}
        <form action={updatePassword}>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
          </div>
          <div className="field">
            <label htmlFor="confirmation">Confirm new password</label>
            <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required />
          </div>
          <button className="btn primary" style={{ width: "100%" }}>Update password</button>
        </form>
        <p className="muted"><Link href="/login" style={{ color: "var(--brand)" }}>← Back to sign in</Link></p>
      </section>
    </main>
  );
}
