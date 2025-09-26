"use client";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function AuthPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin+"/app" }});
    if(error) alert(error.message); else setSent(true);
  };
  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white/10 rounded">
      <h1 className="text-xl mb-4">Sign in</h1>
      {sent? <p>Check your email for the link.</p> :
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full p-2 rounded bg-white/5" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <button className="w-full bg-blue-600 p-2 rounded" type="submit">Send magic link</button>
      </form>}
    </div>
  );
}
