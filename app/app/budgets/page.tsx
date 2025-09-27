"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import Toast from "@/components/Toast";

type Category = { id: string; name: string; kind: "income" | "expense" };
type Budget = { id: string; category_id: string; month: string; limit_amount: number; currency: string };

export default function BudgetsPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const fetchAll = async () => {
    // ...existing fetch...
  };

  useEffect(() => { fetchAll(); }, [month]);

  const addBudget = async (form: FormData) => {
    const { error } = await supabase.from("budgets").insert({
      category_id: String(form.get("category_id")),
      limit_amount: Number(form.get("limit_amount")),
      currency: String(form.get("currency")),
      month: month + "-01",
    });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Budget created" });
    fetchAll();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* ...budgets UI... */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
