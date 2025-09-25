"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // important for Supabase

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Category = { id: string; name: string; kind: "income"|"expense" };
type Account = { id: string; name: string; currency: string; };
type Rule = { id: string; category_id: string; account_id: string; amount: number; currency: string; interval: string; next_run: string; note?: string; };

export default function RecurringPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const fetchAll = async () => {
    const c = await supabase.from("categories").select("*").neq("kind", "transfer").order("name");
    const a = await supabase.from("accounts").select("*").order("name");
    const r = await supabase.from("recurring_rules").select("*").order("next_run");
    if (!c.error) setCategories(c.data as any);
    if (!a.error) setAccounts(a.data as any);
    if (!r.error) setRules(r.data as any);
  };
  useEffect(() => { fetchAll(); }, []);

  const addRule = async (form: FormData) => {
    const category_id = String(form.get("category_id"));
    const account_id = String(form.get("account_id"));
    const amount = Number(form.get("amount"));
    const currency = String(form.get("currency"));
    const interval = String(form.get("interval"));
    const next_run = String(form.get("next_run"));
    const note = String(form.get("note")||"");
    const kind = categories.find(c=>c.id===category_id)?.kind || "expense";
    const { error } = await supabase.from("recurring_rules").insert({ category_id, account_id, amount, currency, interval, next_run, note, kind });
    if (error) alert(error.message); else fetchAll();
  };

  const applyRule = async (rule: Rule) => {
    // Create a transaction for today
    const { error } = await supabase.from("transactions").insert({
      account_id: rule.account_id, category_id: rule.category_id, amount: rule.amount, currency: rule.currency,
      kind: (categories.find(c=>c.id===rule.category_id)?.kind)||"expense",
      tx_date: new Date().toISOString().slice(0,10), note: rule.note || "Recurring"
    });
    if (error) alert(error.message); else alert("Created a transaction.");
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Recurring</h1>

        <div className="card">
          <h2 className="font-semibold mb-2">Add Rule</h2>
          <form action={addRule} className="grid md:grid-cols-6 gap-2">
            <select name="category_id" className="input">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>)}
            </select>
            <select name="account_id" className="input">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input name="amount" type="number" step="0.01" className="input" placeholder="Amount" required />
            <select name="currency" className="input"><option>SSP</option><option>USD</option><option>KES</option></select>
            <select name="interval" className="input"><option>monthly</option><option>weekly</option><option>quarterly</option><option>yearly</option></select>
            <input name="next_run" type="date" className="input" required />
            <input name="note" className="input md:col-span-6" placeholder="Note (optional)" />
            <button className="btn md:col-span-6" type="submit">Save</button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {rules.map(r => (
            <div key={r.id} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{categories.find(c=>c.id===r.category_id)?.name}</div>
                  <div className="text-white/60 text-sm">Every {r.interval} • Next {r.next_run}</div>
                </div>
                <button className="btn" onClick={()=>applyRule(r)}>Apply Now</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
