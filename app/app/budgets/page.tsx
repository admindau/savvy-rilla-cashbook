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
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" } | null>(null);

  const fetchAll = async () => {
    const c = await supabase.from("categories").select("*").eq("kind", "expense");
    const b = await supabase.from("budgets").select("*").gte("month", month + "-01").lte("month", month + "-31");

    if (!c.error) setCats(c.data || []);
    if (!b.error) setBudgets(b.data || []);

    // Fetch expenses for this month
    const start = month + "-01";
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const t = await supabase
      .from("transactions")
      .select("category_id,amount,kind,tx_date,currency")
      .gte("tx_date", start)
      .lte("tx_date", end);

    if (!t.error) {
      const m: Record<string, number> = {};
      (t.data || []).forEach((x: any) => {
        if (x.kind === "expense" && x.category_id) {
          m[x.category_id] = (m[x.category_id] || 0) + Number(x.amount);
        }
      });
      setProgress(m);

      // 🔔 Budget exceeded check
      (b.data || []).forEach((budget) => {
        const spent = m[budget.category_id] || 0;
        if (spent > Number(budget.limit_amount)) {
          const catName = c.data?.find((cat) => cat.id === budget.category_id)?.name ?? "Unknown";
          setToast({ message: `⚠️ You’ve exceeded your budget for ${catName}`, type: "warning" });
        }
      });
    }
  };

  useEffect(() => { fetchAll(); }, [month]);

  const addBudget = async (form: FormData) => {
    const { error } = await supabase.from("budgets").insert({
      category_id: String(form.get("category_id")),
      limit_amount: Number(form.get("limit_amount")),
      currency: String(form.get("currency")),
      month: month + "-01",
    });

    if (error) {
      if (error.message.includes("duplicate key value")) {
        setToast({ message: "⚠️ A budget for this category and month already exists.", type: "warning" });
      } else {
        setToast({ message: error.message, type: "error" });
      }
    } else {
      setToast({ message: "✅ Budget created" });
      fetchAll();
    }
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* ... existing budgets UI ... */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
