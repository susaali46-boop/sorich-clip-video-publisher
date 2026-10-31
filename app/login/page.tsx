import Link from "next/link";
import { signIn, signInWithGoogle } from "@/app/auth/actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const messages: Record<string, string> = {
    invalid: "Email or password is incorrect.",
    missing: "Enter your email and password.",
    google: "Google sign-in is not configured yet. Complete the Google provider setup in Supabase, then try again.",
  };

  return (
    <main className="auth">
      <section className="auth-copy">
        <Link className="brand" href="/"><span className="mark">S</span>SORICH STUDIO</Link>
        <h1>Your creator workspace, all in one place.</h1>
        <p>Sign in to organize your videos, prepare content and keep your publishing workflow moving.</p>
        <p className="muted">Server-managed sessions · Private workspace data · Clear publishing controls</p>
      </section>
      <section className="auth-card">
        <h2>Welcome back</h2>
        <p className="muted">Sign in to continue to your studio.</p>
        {error && <p className="error" role="alert">{messages[error] || "Please check your details and try again."}</p>}
        <form action={signIn}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required minLength={12} />
          </div>
          <button className="btn primary" style={{ width: "100%" }}>Sign in →</button>
        </form>
        <div className="muted" style={{ textAlign: "center", margin: "18px 0" }}>or</div>
        <form action={signInWithGoogle}>
          <button className="btn" style={{ width: "100%" }} type="submit">Continue with Google</button>
        </form>
        <p className="muted">New to Sorich? <Link href="/signup" style={{ color: "var(--brand)" }}>Create an account</Link></p>
        <Link href="/" className="muted">← Back to website</Link>
      </section>
    </main>
  );
}
