"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-4">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">Savvy Rilla Cashbook</h1>
        <p className="text-white/70">
          Your money, your rules — the Savvy way 🚀 🦍
        </p>
        <div className="mt-3 flex gap-2">
          <Link className="btn" href="/auth">Sign in</Link>
          <Link className="btn" href="/app/dashboard">Open App</Link>
        </div>
      </div>
    </div>
  );
}
