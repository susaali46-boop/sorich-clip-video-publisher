"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

const siteOrigin = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function signIn(form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) redirect("/login?error=missing");

  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid");

  const { data: { user } } = await db.auth.getUser();
  if (user) await ensureWorkspace(db, user);
  redirect("/dashboard");
}

export async function signUp(form: FormData) {
  const name = String(form.get("name") || "").trim().slice(0, 80);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!name || !email || password.length < 12) redirect("/signup?error=invalid");

  const db = await createClient();
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
    },
  });
  if (error) redirect("/signup?error=signup");
  if (data.session && data.user) {
    await ensureWorkspace(db, data.user);
    redirect("/dashboard");
  }
  redirect("/signup?sent=1");
}

export async function requestPasswordReset(form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=missing");

  const db = await createClient();
  await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/auth/callback?next=/update-password`,
  });

  // Use the same response whether or not the account exists.
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(form: FormData) {
  const password = String(form.get("password") || "");
  const confirmation = String(form.get("confirmation") || "");
  if (password.length < 12) redirect("/update-password?error=weak");
  if (password !== confirmation) redirect("/update-password?error=mismatch");

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?error=session");

  const { error } = await db.auth.updateUser({ password });
  if (error) redirect("/update-password?error=failed");
  redirect("/login?password=updated");
}

export async function signInWithGoogle() {
  // Google OAuth is intentionally unavailable until the provider is configured.
  redirect("/login?error=google");
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
