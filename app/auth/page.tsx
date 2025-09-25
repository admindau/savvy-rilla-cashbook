"use client";
export const dynamic = "force-dynamic";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-3">Sign in</h1>
      {sent ? (
        <p className="text-white/70">Check your email for the magic link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-1" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </label>
          <button className="btn w-full" type="submit">Send magic link</button>
        </form>
      )}
    </div>
  );
}
