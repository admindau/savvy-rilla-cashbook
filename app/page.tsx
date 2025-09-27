"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-80"
           style={{
             backgroundImage:
               "radial-gradient(40% 60% at 10% 10%, rgba(34,211,238,.15) 0%, transparent 60%)," +
               "radial-gradient(40% 60% at 90% 0%, rgba(167,139,250,.15) 0%, transparent 60%)," +
               "radial-gradient(50% 60% at 50% 100%, rgba(244,114,182,.12) 0%, transparent 60%)",
           }}
      />
      <section className="card md:px-16 md:py-14 px-6 py-10 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Savvy Rilla Cashbook
          </div>
          <p className="text-white/70 mt-4 text-lg md:text-xl">
            Your money, your rules — the Savvy way 🚀 🦍
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link className="btn px-5 py-2" href="/auth">Sign in</Link>
            <Link className="btn px-5 py-2" href="/app/dashboard">Open App</Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="card p-5">
          <div className="text-lg font-semibold mb-1">Track it all</div>
          <div className="text-white/70">Accounts, categories, budgets & recurring rules in one place.</div>
        </div>
        <div className="card p-5">
          <div className="text-lg font-semibold mb-1">See it clearly</div>
          <div className="text-white/70">Colorful charts, currency breakdowns, real-time balances.</div>
        </div>
        <div className="card p-5">
          <div className="text-lg font-semibold mb-1">Move faster</div>
          <div className="text-white/70">Lightning search, pagination, quick add/edit/delete.</div>
        </div>
      </section>
    </div>
  );
}
