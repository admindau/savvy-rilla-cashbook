"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, FormEvent } from "react";
import Toast from "@/components/Toast";

type Rule = {
  id: string;
  category_id: string | null;
  account_id: string | null;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  interval: "weekly" | "monthly" | "quarterly" | "yearly";
  next_run: string;
  note: string | null;
};

export default function Recurring() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" } | null>(null);

  async function load() {
    const { data, error } = await supabase.from("recurring_rules").select("*").order("next_run");
    if (!error) setRules(data || []);
  }

  useEffect(() => { load(); }, []);

  const addRule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("recurring_rules").insert({
      category_id: String(fd.get("category_id") || "") || null,
      account_id: String(fd.get("account_id") || "") || null,
      kind: String(fd.get("kind")) as Rule["kind"],
      amount: Number(fd.get("amount")),
      currency: String(fd.get("currency")),
      interval: String(fd.get("interval")) as Rule["interval"],
      next_run: String(fd.get("next_run")),
      note: (String(fd.get("note")) || "") || null,
    });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Rule created" });
    (e.currentTarget as HTMLFormElement).reset();
    load();
  };

  const applyRule = async (rule: Rule) => {
    const { error: txErr } = await supabase.from("transactions").insert({
      account_id: rule.account_id,
      category_id: rule.category_id,
      amount: rule.amount,
      currency: rule.currency,
      kind: rule.kind,
      tx_date: new Date().toISOString().slice(0, 10),
      note: rule.note,
    });
    if (txErr) return setToast({ message: txErr.message, type: "error" });

    const next = new Date(rule.next_run);
    if (rule.interval === "weekly") next.setDate(next.getDate() + 7);
    if (rule.interval === "monthly") next.setMonth(next.getMonth() + 1);
    if (rule.interval === "quarterly") next.setMonth(next.getMonth() + 3);
    if (rule.interval === "yearly") next.setFullYear(next.getFullYear() + 1);

    const { error } = await supabase.from("recurring_rules")
      .update({ next_run: next.toISOString().slice(0, 10) })
      .eq("id", rule.id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🔄 Rule applied" });

    load();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Recurring Rules</h1>

        {/* Add Rule form (same as before) */}
        <form onSubmit={addRule} className="card grid md:grid-cols-3 gap-3 p-4">
          {/* fields here */}
          <button className="btn">Save</button>
        </form>

        {/* Rules list */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Rules</h3>
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-white/10 py-2">
              <div>
                <div>{r.kind} • {r.currency} {r.amount} • next {r.next_run}</div>
                <div className="text-sm text-white/60">{r.interval} interval</div>
              </div>
              <button className="btn" onClick={() => applyRule(r)}>Apply</button>
            </div>
          ))}
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
