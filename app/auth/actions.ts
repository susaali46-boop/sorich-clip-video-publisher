"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) redirect("/signup?error=signup");
  if (data.session && data.user) {
    await ensureWorkspace(db, data.user);
    redirect("/dashboard");
  }
  redirect("/signup?sent=1");
}

export async function signInWithGoogle() {
  const db = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
