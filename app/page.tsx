"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      setLoggedIn(!!data.user);
    };
    check();
  }, []);

  return (
    <div className="grid gap-4 place-items-center py-20">
      <div className="card text-center p-8 max-w-lg">
        <h1 className="text-3xl font-bold mb-2">Savvy Rilla Cashbook</h1>
        <p className="text-white/70 mb-4">
          Your money, your rules — the Savvy way 🚀 🦍
        </p>
        <div className="flex justify-center gap-3">
          {!loggedIn && (
            <Link className="btn" href="/auth">
              Sign in
            </Link>
          )}
          <Link className="btn" href="/app/dashboard">
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}
