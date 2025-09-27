"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function HeaderRight({ user }: { user: any }) {
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1 rounded hover:bg-white/10"
      >
        <span className="text-sm">{user?.email}</span>
        <span className="material-icons">account_circle</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-black border border-white/10 rounded shadow-lg">
          <div className="px-3 py-2 text-white/70 text-xs">Profile</div>
          <Link
            href="/app/profile/currency-rates"
            className="block px-3 py-2 hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            Currency Rates
          </Link>
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
