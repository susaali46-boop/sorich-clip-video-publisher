import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; password?: string }>;
}) {
  const { error, reset, password } = await searchParams;
  const messages: Record<string, string> = {
    invalid: "That email and password combination did not work. Check your details or reset your password.",
    missing: "Enter your email address and password.",
    session: "Your sign-in session expired. Please sign in again.",
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
        {reset === "sent" && <p className="notice" role="status">If an account exists for that email, a password reset link has been sent.</p>}
        {password === "updated" && <p className="notice" role="status">Your password has been updated. Sign in with your new password.</p>}
        <form action={signIn}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn primary" style={{ width: "100%" }}>Sign in →</button>
        </form>
        <p className="muted" style={{ textAlign: "right" }}>
          <Link href="/forgot-password" style={{ color: "var(--brand)" }}>Forgot password?</Link>
        </p>
        <p className="muted">New to Sorich? <Link href="/signup" style={{ color: "var(--brand)" }}>Create an account</Link></p>
        <Link href="/" className="muted">← Back to website</Link>
      </section>
    </main>
  );
}
