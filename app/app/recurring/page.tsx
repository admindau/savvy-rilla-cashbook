"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, FormEvent } from "react";
import Toast from "@/components/Toast";

type Rule = { id: string; kind: "income" | "expense"; amount: number; currency: string; interval: string; next_run: string; note: string | null; account_id: string | null; category_id: string | null };

export default function Recurring() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  async function load() {
    // ...existing load...
  }

  const addRule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ...
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Rule created" });
    load();
  };

  const applyRule = async (rule: Rule) => {
    // ...
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🔄 Rule applied" });
    load();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* ...recurring UI... */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
