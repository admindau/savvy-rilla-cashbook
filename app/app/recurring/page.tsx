"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, FormEvent } from "react";

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
type Sel = { id: string; name: string };

export default function Recurring() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Sel[]>([]);
  const [accounts, setAccounts] = useState<Sel[]>([]);

  async function load() {
    const [r, c, a] = await Promise.all([
      supabase.from("recurring_rules").select("*").order("next_run"),
      supabase.from("categories").select("id,name").order("name"),
      supabase.from("accounts").select("id,name").order("name"),
    ]);
    if (!r.error) setRules(r.data || []);
    if (!c.error) setCategories(c.data || []);
    if (!a.error) setAccounts(a.data || []);
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
    if (error) alert(error.message);
    (e.currentTarget as HTMLFormElement).reset();
    load();
  };

  const applyRule = async (rule: Rule) => {
    // create a transaction and bump next_run
    const { error: txErr } = await supabase.from("transactions").insert({
      account_id: rule.account_id,
      category_id: rule.category_id,
      amount: rule.amount,
      currency: rule.currency,
      kind: rule.kind,
      tx_date: new Date().toISOString().slice(0, 10),
      note: rule.note,
    });
    if (txErr) return alert(txErr.message);

    // naive next_run bump
    const next = new Date(rule.next_run);
    if (rule.interval === "weekly") next.setDate(next.getDate() + 7);
    if (rule.interval === "monthly") next.setMonth(next.getMonth() + 1);
    if (rule.interval === "quarterly") next.setMonth(next.getMonth() + 3);
    if (rule.interval === "yearly") next.setFullYear(next.getFullYear() + 1);

    const { error } = await supabase.from("recurring_rules")
      .update({ next_run: next.toISOString().slice(0, 10) })
      .eq("id", rule.id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Recurring</h1>

        <div className="card">
          <h3 className="font-semibold mb-2">Add Rule</h3>
          <form onSubmit={addRule} className="grid md:grid-cols-3 gap-3">
            <select name="account_id" className="input">
              <option value="">(No account)</option>
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
            <select name="category_id" className="input">
              <option value="">Uncategorized</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className="input"><option>income</option><option>expense</option></select>
              <select name="interval" className="input">
                <option>weekly</option><option>monthly</option><option>quarterly</option><option>yearly</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="amount" type="number" step="0.01" placeholder="Amount" className="input" />
              <select name="currency" className="input"><option>SSP</option><option>USD</option><option>KES</option></select>
            </div>
            <input name="next_run" type="date" className="input" />
            <input name="note" className="input" placeholder="Note (optional)" />
            <div><button className="btn">Save</button></div>
          </form>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Rules</h3>
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="text-sm">
                  <div className="font-medium">{r.kind} • {r.currency} {r.amount.toFixed(2)} • next {r.next_run}</div>
                  <div className="text-white/60">acct: {accounts.find(a=>a.id===r.account_id)?.name ?? "—"} · cat: {categories.find(c=>c.id===r.category_id)?.name ?? "—"} · {r.interval}</div>
                </div>
                <button className="btn" onClick={() => applyRule(r)}>Apply now</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
