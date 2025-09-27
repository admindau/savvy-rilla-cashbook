"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <header className="border-b border-white/10 bg-white/5">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={28} height={28} />
          <span className="font-semibold">Savvy Rilla Cashbook</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/app/dashboard" className="text-white/80 hover:underline">Dashboard</Link>
          <Link href="/app/budgets" className="text-white/80 hover:underline">Budgets</Link>
          <Link href="/app/recurring" className="text-white/80 hover:underline">Recurring</Link>

          <div className="relative">
            <button
              className="card px-3 py-1 flex items-center gap-2 hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
            >
              <div className="w-6 h-6 rounded-full bg-white/20 grid place-items-center">👤</div>
              <span className="text-sm">{email ?? "Profile"}</span>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-56 card p-2 z-20">
                <div className="px-2 py-1 text-xs text-white/60 border-b border-white/10 mb-2">
                  {email ?? "Not signed in"}
                </div>
                <button
                  onClick={() => (window.location.href = "/app/dashboard")}
                  className="w-full text-left px-2 py-2 hover:bg-white/10 rounded"
                >
                  Profile (coming soon)
                </button>
                <button
                  onClick={signOut}
                  className="w-full text-left px-2 py-2 hover:bg-white/10 rounded"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
