"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { fmt, currencies } from "@/lib/format";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
} from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: "income" | "expense" };
type Tx = {
  id: string;
  amount: number;
  currency: string;
  kind: "income" | "expense" | "transfer";
  tx_date: string;
  account_id: string;
  category_id: string | null;
  note: string | null;
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const limit = 50;

  const [showLifetimeTotals, setShowLifetimeTotals] = useState(false);
  const [showMonthlyTotals, setShowMonthlyTotals] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Tx>>({});

  async function fetchIdsAndCount(q: string) {
    let catIds: string[] = [];
    if (q) {
      const c = await supabase.from("categories").select("id").ilike("name", `%${q}%`);
      if (!c.error) catIds = (c.data || []).map((x: any) => x.id);
    }
    let tr = supabase.from("transactions").select("id", { count: "exact", head: true });
    if (q) {
      tr = tr.or(`note.ilike.%${q}%,currency.ilike.%${q}%,kind.ilike.%${q}%`);
      if (catIds.length) tr = tr.in("category_id", catIds);
    }
    const r = await tr;
    setCount(r.count || 0);
    return catIds;
  }

  async function load(p: number, q: string) {
    const from = p * limit;
    const to = from + limit - 1;
    const catIds = await fetchIdsAndCount(q);

    let t = supabase
      .from("transactions")
      .select("id,amount,currency,kind,tx_date,account_id,category_id,note")
      .order("tx_date", { ascending: false })
      .range(from, to);
    if (q) {
      t = t.or(`note.ilike.%${q}%,currency.ilike.%${q}%,kind.ilike.%${q}%`);
      if (catIds.length) t = t.in("category_id", catIds);
    }

    const [a, c, tr] = await Promise.all([
      supabase.from("accounts").select("id,name,currency").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name,kind").order("name"),
      t,
    ]);

    if (!a.error) setAccounts(a.data || []);
    if (!c.error) setCategories(c.data || []);
    if (!tr.error) setTxs(tr.data || []);
  }

  useEffect(() => {
    load(0, "");
  }, []);
  useEffect(() => {
    setPage(0);
    load(0, query);
  }, [query]);

  // Lifetime & Monthly balances
  const lifetime = useMemo(() => {
    const m: Record<string, number> = {};
    txs.forEach((t) => {
      const s = t.kind === "income" ? Number(t.amount) : t.kind === "expense" ? -Number(t.amount) : 0;
      m[t.currency] = (m[t.currency] || 0) + s;
    });
    return m;
  }, [txs]);

  const monthly = useMemo(() => {
    const first = new Date();
    first.setDate(1);
    const m: Record<string, number> = {};
    txs.forEach((t) => {
      if (new Date(t.tx_date) >= first) {
        const s = t.kind === "income" ? Number(t.amount) : t.kind === "expense" ? -Number(t.amount) : 0;
        m[t.currency] = (m[t.currency] || 0) + s;
      }
    });
    return m;
  }, [txs]);

  // Charts
  const donut = useMemo(() => {
    const first = new Date();
    first.setDate(1);
    const by: Record<string, number> = {};
    txs.forEach((t) => {
      if (new Date(t.tx_date) >= first && t.kind === "expense" && t.category_id) {
        by[t.category_id] = (by[t.category_id] || 0) + Number(t.amount);
      }
    });
    const expCats = categories.filter((c) => c.kind === "expense");
    return {
      labels: expCats.map((c) => c.name),
      datasets: [
        {
          data: expCats.map((c) => by[c.id] || 0),
          backgroundColor: ["#22d3ee","#a78bfa","#fb7185","#34d399","#f59e0b","#f472b6","#84cc16","#e879f9","#f97316"],
        },
      ],
    };
  }, [txs, categories]);

  const bar = useMemo(() => {
    const first = new Date();
    first.setDate(1);
    const inc: Record<string, number> = {}, exp: Record<string, number> = {};
    (currencies as unknown as string[]).forEach((k) => { inc[k] = 0; exp[k] = 0; });
    txs.forEach((t) => {
      if (new Date(t.tx_date) >= first) {
        if (t.kind === "income") inc[t.currency] += Number(t.amount);
        if (t.kind === "expense") exp[t.currency] += Number(t.amount);
      }
    });
    const labels = currencies as unknown as string[];
    return {
      labels,
      datasets: [
        { label: "Income", data: labels.map((k) => inc[k] || 0), backgroundColor: "#22c55e" },
        { label: "Expense", data: labels.map((k) => exp[k] || 0), backgroundColor: "#ef4444" },
      ],
    };
  }, [txs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(count / limit));
  const prev = () => { const p = Math.max(0, page - 1); setPage(p); load(p, query); };
  const next = () => { const p = Math.min(totalPages - 1, page + 1); setPage(p); load(p, query); };

  // CRUD handlers
  const addTx = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("transactions").insert({
      account_id: String(fd.get("account_id")),
      category_id: (String(fd.get("category_id")) || "") || null,
      amount: Number(fd.get("amount")),
      currency: String(fd.get("currency")),
      kind: String(fd.get("kind")),
      tx_date: String(fd.get("tx_date")),
      note: (String(fd.get("note")) || "") || null,
    });
    if (error) alert(error.message);
    (e.currentTarget as HTMLFormElement).reset();
    load(page, query);
  };

  const startEdit = (t: Tx) => {
    setEditingId(t.id);
    setEditDraft({ ...t });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };
  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("transactions").update({
      amount: Number(editDraft.amount),
      currency: String(editDraft.currency),
      kind: String(editDraft.kind),
      tx_date: String(editDraft.tx_date),
      account_id: String(editDraft.account_id),
      category_id: editDraft.category_id ? String(editDraft.category_id) : null,
      note: editDraft.note ?? null,
    }).eq("id", editingId);
    if (error) alert(error.message);
    setEditingId(null);
    setEditDraft({});
    load(page, query);
  };
  const delTx = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) alert(error.message);
    load(page, query);
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Search */}
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Search Transactions</h3>
            <input
              className="input max-w-md"
              placeholder="🔍 Search by note, currency, kind, or category name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Balances */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`card cursor-pointer transition ${
              showLifetimeTotals ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40" : "hover:bg-white/10"
            }`}
            onClick={() => setShowLifetimeTotals((v) => !v)}
          >
            <h2 className="font-semibold mb-2">Balances (Lifetime)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(currencies as unknown as string[]).map((cur) => (
                <div key={cur} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(lifetime[cur] || 0, cur)}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`card cursor-pointer transition ${
              showMonthlyTotals ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40" : "hover:bg-white/10"
            }`}
            onClick={() => setShowMonthlyTotals((v) => !v)}
          >
            <h2 className="font-semibold mb-2">Balances (This Month)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(currencies as unknown as string[]).map((cur) => (
                <div key={cur} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(monthly[cur] || 0, cur)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Totals */}
        {showLifetimeTotals && (
          <div className="text-sm text-white/80">
            {(currencies as unknown as string[]).map((cur) => {
              const income = txs.filter((t) => t.currency === cur && t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
              const expense = txs.filter((t) => t.currency === cur && t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
              const balance = income - expense;
              return (
                <div key={`lt-${cur}`} className="mb-1">
                  <strong>{cur}</strong> (Lifetime): Balance {fmt(balance, cur)} | Income {fmt(income, cur)} | Expense {fmt(expense, cur)}
                </div>
              );
            })}
          </div>
        )}
        {showMonthlyTotals && (
          <div className="text-sm text-white/80">
            {(currencies as unknown as string[]).map((cur) => {
              const first = new Date(); first.setDate(1);
              const inMonth = (t: Tx) => new Date(t.tx_date) >= first;
              const income = txs.filter((t) => inMonth(t) && t.currency === cur && t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
              const expense = txs.filter((t) => inMonth(t) && t.currency === cur && t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
              const balance = income - expense;
              return (
                <div key={`mo-${cur}`} className="mb-1">
                  <strong>{cur}</strong> (This Month): Balance {fmt(balance, cur)} | Income {fmt(income, cur)} | Expense {fmt(expense, cur)}
                </div>
              );
            })}
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Expenses by Category (Donut)</h3>
            <Doughnut data={donut} />
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Income vs Expense (per currency)</h3>
            <Bar data={bar} />
          </div>
        </div>

        {/* Recent Transactions (50 per page) */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Transactions</h3>
            <div className="text-white/60 text-sm">
              Page {page + 1} / {totalPages} • {count} results
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/70">
                  <th>Date</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Kind</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => {
                  const isEditing = editingId === t.id;
                  return (
                    <tr key={t.id} className="border-t border-white/10 align-top">
                      {!isEditing ? (
                        <>
                          <td>{t.tx_date}</td>
                          <td>{accounts.find((a) => a.id === t.account_id)?.name}</td>
                          <td>{categories.find((c) => c.id === t.category_id)?.name ?? "—"}</td>
                          <td>{t.kind}</td>
                          <td>{fmt(Number(t.amount), t.currency)}</td>
                          <td className="max-w-xs truncate">{t.note ?? ""}</td>
                          <td className="text-right">
                            <button className="underline mr-3" onClick={() => startEdit(t)}>Edit</button>
                            <button className="underline text-red-300" onClick={() => delTx(t.id)}>Delete</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><input type="date" className="input" value={String(editDraft.tx_date)} onChange={(e)=>setEditDraft((d)=>({...d, tx_date:e.target.value}))}/></td>
                          <td>
                            <select className="input" value={String(editDraft.account_id)} onChange={(e)=>setEditDraft((d)=>({...d, account_id:e.target.value}))}>
                              {accounts.map((a)=>(<option key={a.id} value={a.id}>{a.name}</option>))}
                            </select>
                          </td>
                          <td>
                            <select className="input" value={String(editDraft.category_id ?? "")} onChange={(e)=>setEditDraft((d)=>({...d, category_id:e.target.value || null}))}>
                              <option value="">Uncategorized</option>
                              {categories.map((c)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                          </td>
                          <td>
                            <select className="input" value={String(editDraft.kind)} onChange={(e)=>setEditDraft((d)=>({...d, kind:e.target.value as Tx["kind"]}))}>
                              <option value="income">income</option>
                              <option value="expense">expense</option>
                              <option value="transfer">transfer</option>
                            </select>
                          </td>
                          <td>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" className="input" value={Number(editDraft.amount ?? 0)} onChange={(e)=>setEditDraft((d)=>({...d, amount:Number(e.target.value)}))}/>
                              <select className="input" value={String(editDraft.currency)} onChange={(e)=>setEditDraft((d)=>({...d, currency:e.target.value}))}>
                                {(currencies as unknown as string[]).map((c)=> (<option key={c}>{c}</option>))}
                              </select>
                            </div>
                          </td>
                          <td><input className="input" value={String(editDraft.note ?? "")} onChange={(e)=>setEditDraft((d)=>({...d, note:e.target.value}))}/></td>
                          <td className="text-right">
                            <button className="underline mr-3" onClick={saveEdit}>Save</button>
                            <button className="underline" onClick={cancelEdit}>Cancel</button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button className="btn" onClick={prev} disabled={page === 0}>Previous</button>
            <button className="btn" onClick={next} disabled={page >= totalPages - 1}>Next</button>
          </div>
        </div>

        {/* New Transaction */}
        <div className="card">
          <h3 className="font-semibold mb-3">New Transaction</h3>
          <form onSubmit={addTx} className="grid md:grid-cols-3 gap-3">
            <div className="grid grid-cols-2 gap-2">
              <input name="amount" type="number" step="0.01" placeholder="Amount" required className="input" />
              <select name="currency" className="input">
                {(currencies as unknown as string[]).map((c) => (<option key={c}>{c}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className="input">
                <option value="income">income</option>
                <option value="expense">expense</option>
                <option value="transfer">transfer</option>
              </select>
              <input name="tx_date" type="date" required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select name="account_id" className="input">
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              <select name="category_id" className="input">
                <option value="">Uncategorized</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <input name="note" placeholder="Note" className="input md:col-span-3" />
            <div><button className="btn">Add</button></div>
          </form>
        </div>

        {/* New Account */}
        <div className="card">
          <h3 className="font-semibold mb-3">New Account</h3>
          <form
            action={async (fd: FormData) => {
              const { error } = await supabase.from("accounts").insert({
                name: String(fd.get("name")),
                currency: String(fd.get("currency")),
              });
              if (error) alert(error.message);
              else load(page, query);
            }}
            className="grid md:grid-cols-3 gap-3"
          >
            <input name="name" placeholder="Name" required className="input" />
            <select name="currency" className="input">
              {(currencies as unknown as string[]).map((c) => (<option key={c}>{c}</option>))}
            </select>
            <button className="btn">Add</button>
          </form>
        </div>

        {/* New Category */}
        <div className="card">
          <h3 className="font-semibold mb-3">New Category</h3>
          <form
            action={async (fd: FormData) => {
              const { error } = await supabase.from("categories").insert({
                name: String(fd.get("name")),
                kind: String(fd.get("kind")),
              });
              if (error) alert(error.message);
              else load(page, query);
            }}
            className="grid md:grid-cols-3 gap-3"
          >
            <input name="name" placeholder="Name" required className="input" />
            <select name="kind" className="input">
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
            <button className="btn">Add</button>
          </form>
        </div>
      </div>
    </RequireAuth>
  );
}
