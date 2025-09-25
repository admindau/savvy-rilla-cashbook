"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";

type Category = { id: string; name: string; kind: "income"|"expense" };
type Budget = { id: string; category_id: string; month: string; limit_amount: number; currency: string; };
type Tx = { category_id: string|null; amount: number; kind: string; currency: string; };

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));

  const fetchAll = async () => {
    const c = await supabase.from("categories").select("*").eq("kind","expense").order("name");
    const b = await supabase.from("budgets").select("*").like("month", month + "%");
    const start = month + "-01";
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth()+1, 0).toISOString().slice(0,10);
    const t = await supabase.from("transactions").select("category_id, amount, kind, currency").gte("tx_date", start).lte("tx_date", end);
    if (!c.error) setCategories(c.data as any);
    if (!b.error) setBudgets(b.data as any);
    if (!t.error) {
      const map: Record<string, number> = {};
      (t.data as Tx[]).forEach(tx => {
        if (tx.kind === "expense" && tx.category_id) map[tx.category_id] = (map[tx.category_id]||0) + Number(tx.amount);
      });
      setProgress(map);
    }
  };
  useEffect(() => { fetchAll(); }, [month]);

  const addBudget = async (form: FormData) => {
    const category_id = String(form.get("category_id"));
    const limit_amount = Number(form.get("limit_amount"));
    const currency = String(form.get("currency"));
    const monthDate = month + "-01";
    const { error } = await supabase.from("budgets").insert({ category_id, limit_amount, currency, month: monthDate });
    if (error) alert(error.message); else fetchAll();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <input className="input" type="month" value={month} onChange={e=>setMonth(e.target.value)} />
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Add Budget</h2>
          <form action={addBudget} className="grid md:grid-cols-4 gap-2">
            <select name="category_id" className="input">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="limit_amount" className="input" type="number" step="0.01" placeholder="Limit amount" required />
            <select name="currency" className="input"><option>SSP</option><option>USD</option><option>KES</option></select>
            <button className="btn" type="submit">Save</button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {budgets.map(b => {
            const spent = progress[b.category_id] || 0;
            const pct = Math.min(100, Math.round(100*spent/Number(b.limit_amount)));
            return (
              <div key={b.id} className="card">
                <div className="flex justify-between">
                  <div className="font-semibold">{categories.find(c=>c.id===b.category_id)?.name}</div>
                  <div className="text-white/70">{fmt(Number(b.limit_amount), b.currency)}</div>
                </div>
                <div className="h-2 bg-white/10 rounded mt-3 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: pct + "%" }} />
                </div>
                <div className="text-white/70 mt-1">{fmt(spent, b.currency)} spent • {pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </RequireAuth>
  );
}
