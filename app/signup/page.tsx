import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const messages: Record<string, string> = {
    name: "Enter your name (at least 2 characters).",
    email: "Enter a valid email address, for example name@example.com.",
    password: "Your password must contain at least 12 characters. It is not a 12-character maximum.",
    signup: "We couldn't create your account. The email may already be registered, or the password may not meet the account security rules. Try signing in or resetting your password.",
  };

  return (
    <main className="auth">
      <section className="auth-copy">
        <Link className="brand" href="/"><span className="mark">S</span>SORICH STUDIO</Link>
        <h1>Build a better rhythm for your content.</h1>
        <p>Create your private studio for video organization, post drafts and publishing plans.</p>
        <p className="muted">No payment setup · No automatic publishing · You stay in control</p>
      </section>
      <section className="auth-card">
        <h2>Create your account</h2>
        <p className="muted">Start with your own private workspace.</p>
        {sent && <p className="notice" role="status">Your account was created. You can now sign in.</p>}
        {error && <p className="error" role="alert">{messages[error] || "We couldn't create the account. Please try again."}</p>}
        <form action={signUp}>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" aria-describedby="password-help" />
            <small id="password-help" className="muted">At least 12 characters. Longer passwords are allowed.</small>
          </div>
          <button className="btn primary" style={{ width: "100%" }}>Create my workspace →</button>
        </form>
        <p className="muted">Already registered? <Link href="/login" style={{ color: "var(--brand)" }}>Sign in</Link></p>
        <Link href="/" className="muted">← Back to website</Link>
      </section>
    </main>
  );
}
