"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { fmt } from "@/lib/format";
import Toast from "@/components/Toast";
import { useEffect, useState, FormEvent } from "react";
import { useFxRates } from "@/lib/useFxRates";

import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Category = { id: string; name: string; kind: "income" | "expense" };
type Budget = { id: string; category_id: string; month: string; limit_amount: number; currency: string; user_id?: string };
type Tx = { category_id: string | null; amount: number; kind: "income" | "expense"; tx_date: string; currency: string; user_id?: string };

const palette = ["#22d3ee","#a78bfa","#fb7185","#34d399","#f59e0b","#f472b6","#84cc16","#e879f9","#f97316"];
const colorById = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return palette[h%palette.length]; };

export default function BudgetsPage() {
  const { convert, loading } = useFxRates();

  const [cats, setCats] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Budget>>({});
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" } | null>(null);

  const [chartCurrency, setChartCurrency] = useState<"USD"|"SSP"|"KES">("SSP");

  useEffect(()=>{ if(!loading) fetchAll(); },[month,loading]); // eslint-disable-line

  const fetchAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { data: cData } = await supabase.from("categories").select("*").eq("kind", "expense");
    setCats(cData || []);

    if (!user_id) { setBudgets([]); setProgress({}); return; }

    const { data: bData } = await supabase
      .from("budgets").select("*")
      .eq("user_id", user_id).eq("month", month + "-01");
    setBudgets(bData || []);

    const start = month + "-01";
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth()+1, 0).toISOString().slice(0,10);
    const { data: tData } = await supabase
      .from("transactions").select("category_id,amount,kind,tx_date,currency,user_id")
      .eq("user_id", user_id).gte("tx_date", start).lte("tx_date", end);

    const m: Record<string, number> = {};
    (tData || []).forEach((x: Tx) => { if (x.kind === "expense" && x.category_id) m[x.category_id] = (m[x.category_id] || 0) + Number(x.amount); });
    setProgress(m);

    // over-limit alert
    (bData || []).forEach((b) => {
      const spent = m[b.category_id] || 0;
      if (spent > Number(b.limit_amount)) {
        const name = (cData || []).find((c) => c.id === b.category_id)?.name ?? "Unknown";
        setToast({ message: `⚠️ Over budget for ${name}`, type: "warning" });
      }
    });
  };

  const addBudget = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) { setToast({ message: "❌ No logged-in user", type: "error" }); return; }

    const { error, data } = await supabase.from("budgets").insert([{
      user_id,
      category_id: String(fd.get("category_id")),
      limit_amount: Number(fd.get("limit_amount")),
      currency: String(fd.get("currency")),
      month: month + "-01",
    }]).select();

    if (error) {
      if (error.message.includes("duplicate key")) setToast({ message: "⚠️ Budget already exists for this category + month", type: "warning" });
      else setToast({ message: error.message, type: "error" });
    } else if (!data || data.length === 0) {
      setToast({ message: "❌ Insert failed — no row returned", type: "error" });
    } else {
      setToast({ message: "✅ Budget created" });
      fetchAll();
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { error } = await supabase.from("budgets").update({
      user_id,
      category_id: String(editDraft.category_id),
      limit_amount: Number(editDraft.limit_amount),
      currency: String(editDraft.currency),
    }).eq("id", editingId).eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Budget updated" });
    setEditingId(null); setEditDraft({});
    fetchAll();
  };

  const delBudget = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id; if (!user_id) return;
    if (!confirm("Delete this budget?")) return;
    const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user_id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Budget deleted" });
    fetchAll();
  };

  const filtered = budgets.filter((b) => (cats.find((c) => c.id === b.category_id)?.name ?? "").toLowerCase().includes(query.toLowerCase()));

  // Charts (converted using useFxRates)
  if (loading) return <div>Loading FX rates...</div>;

  const donut = {
    labels: filtered.map((b) => cats.find((c) => c.id === b.category_id)?.name ?? "—"),
    datasets: [{ data: filtered.map((b) => convert(Number(b.limit_amount), b.currency, chartCurrency)), backgroundColor: filtered.map((b) => colorById(b.category_id)) }],
  };
  const bar = {
    labels: filtered.map((b) => cats.find((c) => c.id === b.category_id)?.name ?? "—"),
    datasets: [
      { label: "Spent", data: filtered.map((b) => convert(progress[b.category_id] || 0, b.currency, chartCurrency)), backgroundColor: "#ef4444" },
      { label: "Budget", data: filtered.map((b) => convert(Number(b.limit_amount), b.currency, chartCurrency)), backgroundColor: "#22c55e" },
    ],
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>

        {/* Add Budget */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Budget</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); addBudget(new FormData(e.currentTarget)); (e.currentTarget as HTMLFormElement).reset(); }}
            className="grid md:grid-cols-4 gap-2"
          >
            <select name="category_id" className="input">{cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
            <input name="limit_amount" className="input" type="number" step="0.01" placeholder="Limit amount" required />
            <select name="currency" className="input"><option>SSP</option><option>USD</option><option>KES</option></select>
            <button className="btn">Save</button>
          </form>
        </div>

        {/* Search */}
        <div className="card flex items-center justify-between gap-3">
          <h3 className="font-semibold">Search Budgets</h3>
          <input className="input max-w-md" placeholder="🔍 Search by category..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {/* Budgets list */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">All Budgets</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr><th>Category</th><th>Limit</th><th>Currency</th><th>Month</th><th>Spent</th><th>% Used</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const spent = progress[b.category_id] || 0;
                const pct = b.limit_amount ? Math.round((100 * spent) / Number(b.limit_amount)) : 0;
                const name = cats.find((c) => c.id === b.category_id)?.name ?? "—";
                const isEditing = editingId === b.id;
                return (
                  <tr key={b.id} className="border-t border-white/10">
                    {!isEditing ? (
                      <>
                        <td>{name}</td>
                        <td>{fmt(Number(b.limit_amount), b.currency)}</td>
                        <td>{b.currency}</td>
                        <td>{b.month}</td>
                        <td>{fmt(spent, b.currency)}</td>
                        <td>{pct}%</td>
                        <td>
                          <button className="underline mr-2" onClick={() => { setEditingId(b.id); setEditDraft(b); }}>Edit</button>
                          <button className="underline text-red-400" onClick={() => delBudget(b.id)}>Delete</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <select className="input" value={String(editDraft.category_id)} onChange={(e) => setEditDraft((d) => ({ ...d, category_id: e.target.value }))}>
                            {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                          </select>
                        </td>
                        <td><input type="number" className="input" value={Number(editDraft.limit_amount)} onChange={(e) => setEditDraft((d) => ({ ...d, limit_amount: Number(e.target.value) }))} /></td>
                        <td>
                          <select className="input" value={String(editDraft.currency)} onChange={(e) => setEditDraft((d) => ({ ...d, currency: e.target.value }))}>
                            <option>SSP</option><option>USD</option><option>KES</option>
                          </select>
                        </td>
                        <td>{b.month}</td>
                        <td>{fmt(progress[b.category_id] || 0, b.currency)}</td>
                        <td>—</td>
                        <td>
                          <button className="underline mr-2" onClick={saveEdit}>Save</button>
                          <button className="underline" onClick={() => { setEditingId(null); setEditDraft({}); }}>Cancel</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Progress bars */}
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((b) => {
            const spent = progress[b.category_id] || 0;
            const pct = b.limit_amount ? Math.min(100, Math.round((100 * spent) / Number(b.limit_amount))) : 0;
            const col = colorById(b.category_id);
            const name = cats.find((c) => c.id === b.category_id)?.name ?? "—";
            return (
              <div key={b.id} className="card">
                <div className="flex justify-between">
                  <div className="font-semibold"><span className="legend-dot" style={{ backgroundColor: col }} />{name}</div>
                  <div className="text-white/70">{fmt(Number(b.limit_amount), b.currency)}</div>
                </div>
                <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
                </div>
                <div className="text-sm text-white/70 mt-1">{pct}% used • Spent {fmt(spent, b.currency)}</div>
              </div>
            );
          })}
        </div>

        {/* Charts with FX toggle */}
        <div className="flex justify-end gap-2">
          {(["SSP","USD","KES"] as const).map((c)=>(
            <button key={c} className={`btn ${chartCurrency===c?"bg-cyan-600":""}`} onClick={()=>setChartCurrency(c)}>{c}</button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card"><h3 className="font-semibold mb-3">Budget Breakdown ({chartCurrency})</h3><Doughnut data={donut}/></div>
          <div className="card"><h3 className="font-semibold mb-3">Spent vs Budget ({chartCurrency})</h3><Bar data={bar}/></div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
