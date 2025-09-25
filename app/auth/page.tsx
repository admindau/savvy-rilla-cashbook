"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { useState, FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + "/app" } });
    if (error) alert(error.message);
    else setSent(true);
  };

  return (
    <div>
      <h1>Sign In</h1>
      {sent ? <p>Check your email for the link.</p> : (
        <form onSubmit={submit}>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <button type="submit">Send magic link</button>
        </form>
      )}
    </div>
  );
}
