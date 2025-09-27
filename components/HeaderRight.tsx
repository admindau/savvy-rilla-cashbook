"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";

export default function HeaderRight() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setToast({ message: error.message, type: "error" });
    } else {
      setToast({ message: "👋 Logged out" });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1200);
    }
  };

  return (
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
