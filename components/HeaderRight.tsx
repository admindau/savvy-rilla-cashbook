"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function HeaderRight() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email || null);
    };
    getUser();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // redirect home
  };

  if (!email) return null;

  return (
    <div className="relative group">
      <button className="px-3 py-1 rounded hover:bg-white/10">
        {email}
      </button>
      <div className="absolute right-0 mt-2 w-40 bg-neutral-900 border border-white/10 rounded shadow-lg hidden group-hover:block">
        <Link
          href="/app/profile/fx"
          className="block px-4 py-2 hover:bg-white/10"
        >
          FX
        </Link>
        <button
          onClick={signOut}
          className="block w-full text-left px-4 py-2 hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
