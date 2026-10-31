import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";

export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <main className="auth">
      <section className="auth-copy">
        <Link className="brand" href="/"><span className="mark">S</span>SORICH STUDIO</Link>
        <h1>Get back into your studio.</h1>
        <p>Request a secure password reset link for your account.</p>
      </section>
      <section className="auth-card">
        <h2>Reset your password</h2>
        <p className="muted">Enter the email address you used to create your account.</p>
        {sent && <p className="notice" role="status">If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.</p>}
        {error && <p className="error" role="alert">Enter a valid email address and try again.</p>}
        <form action={requestPasswordReset}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <button className="btn primary" style={{ width: "100%" }}>Send reset link</button>
        </form>
        <p className="muted"><Link href="/login" style={{ color: "var(--brand)" }}>← Back to sign in</Link></p>
      </section>
    </main>
  );
}
