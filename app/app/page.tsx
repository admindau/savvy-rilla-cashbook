"use client"; export const dynamic = "force-dynamic"; export const runtime = "nodejs";
import RequireAuth from "@/components/RequireAuth"; import { supabase } from "@/lib/supabaseClient"; import { insertWithUser } from "@/lib/withUserInsert";
import { useEffect, useMemo, useState } from "react"; import { fmt } from "@/lib/format"; import { colorForId, paletteByIndex } from "@/lib/palette";
import { Bar, Doughnut } from "react-chartjs-2"; import { Chart as ChartJS, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);
type Account = { id: string; name: string; currency: string; balance: number; };
type Category = { id: string; name: string; kind: "income"|"expense"; color?: string; };
type Tx = { id: string; account_id: string; category_id: string|null; amount: number; kind: string; currency: string; tx_date: string; note?: string; };
export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txsMonth, setTxsMonth] = useState<Tx[]>([]);
  const [txsAll, setTxsAll] = useState<Tx[]>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [query, setQuery] = useState<string>("");
  const fetchAll = async () => {
    const a = await supabase.from("accounts").select("*").order("created_at", { ascending: true });
    const c = await supabase.from("categories").select("*").order("created_at", { ascending: true });
    const start = month + "-01";
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth()+1, 0).toISOString().slice(0,10);
    const tMonth = await supabase.from("transactions").select("*").gte("tx_date", start).lte("tx_date", end).order("tx_date", { ascending: false });
    const tAll = await supabase.from("transactions").select("*").order("tx_date", { ascending: false });
    if (!a.error) setAccounts(a.data as any);
    if (!c.error) setCategories(c.data as any);
    if (!tMonth.error) setTxsMonth(tMonth.data as any);
    if (!tAll.error) setTxsAll(tAll.data as any);
  }; useEffect(() => { fetchAll(); }, [month]);
  const totalsMonth = useMemo(() => { const res = new Map<string,{ income:number, expense:number }>(); txsMonth.forEach(tx => {
      const cur = res.get(tx.currency) ?? { income:0, expense:0 }; if (tx.kind === "income") cur.income += Number(tx.amount); if (tx.kind === "expense") cur.expense += Number(tx.amount); res.set(tx.currency, cur);
    }); return res; }, [txsMonth]);
  const totalsAll = useMemo(() => { const res = new Map<string,{ income:number, expense:number }>(); txsAll.forEach(tx => {
      const cur = res.get(tx.currency) ?? { income:0, expense:0 }; if (tx.kind === "income") cur.income += Number(tx.amount); if (tx.kind === "expense") cur.expense += Number(tx.amount); res.set(tx.currency, cur);
    }); return res; }, [txsAll]);
  const donutData = useMemo(() => { const expenseByCat = new Map<string, number>(); txsMonth.forEach(tx => {
      if (tx.kind === "expense" && tx.category_id) { const key = tx.category_id; expenseByCat.set(key, (expenseByCat.get(key)||0) + Number(tx.amount)); }
    }); const labels = Array.from(expenseByCat.keys()).map(id => categories.find(c=>c.id===id)?.name || "Uncategorized"); const data = Array.from(expenseByCat.values());
    const bg = Array.from(expenseByCat.keys()).map(id => colorForId(id)); return { labels, datasets: [{ label: "Expenses", data, backgroundColor: bg }] };
  }, [txsMonth, categories]);
  const filteredTx = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return txsMonth; return txsMonth.filter(tx => {
      const acc = accounts.find(a=>a.id===tx.account_id)?.name?.toLowerCase() || ""; const cat = categories.find(c=>c.id===tx.category_id||"")?.name?.toLowerCase() || ""; const note = (tx.note||"").toLowerCase(); const date = tx.tx_date.toString();
      return acc.includes(q) || cat.includes(q) || note.includes(q) || date.includes(q) || tx.kind.toLowerCase().includes(q) || tx.currency.toLowerCase().includes(q);
    }); }, [txsMonth, accounts, categories, query]);
  const barLabels = ["SSP","USD","KES"]; const incomeByCur = barLabels.map(cur => (totalsMonth.get(cur)?.income)||0); const expenseByCur = barLabels.map(cur => (totalsMonth.get(cur)?.expense)||0);
  const barData = { labels: barLabels, datasets: [
    { label: "Income", data: incomeByCur, backgroundColor: barLabels.map((_,i)=>paletteByIndex(i)) },
    { label: "Expense", data: expenseByCur, backgroundColor: barLabels.map((_,i)=>paletteByIndex(i+3)) } ] };
  const chartOptions = { plugins: { legend: { display: true } } };
  const addAccount = async (form: FormData) => { const name = String(form.get("name")); const currency = String(form.get("currency"));
    const { error } = await insertWithUser("accounts", { name, currency }); if (error) alert((error as any).message); else fetchAll(); };
  const addCategory = async (form: FormData) => { const name = String(form.get("name")); const kind = String(form.get("kind"));
    const { error } = await insertWithUser("categories", { name, kind }); if (error) alert((error as any).message); else fetchAll(); };
  const addTx = async (form: FormData) => { const account_id = String(form.get("account_id")); const category_id = String(form.get("category_id")||"") || null;
    const kind = String(form.get("kind")); const amount = Number(form.get("amount")); const currency = String(form.get("currency")); const tx_date = String(form.get("tx_date")); const note = String(form.get("note")||"");
    const { error } = await insertWithUser("transactions", { account_id, category_id, kind, amount, currency, tx_date, note }); if (error) alert((error as any).message); else fetchAll(); };
  return (<RequireAuth>
    <div className="grid gap-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2"><input className="input" type="search" placeholder="Search transactions…" value={query} onChange={e=>setQuery(e.target.value)} /><input className="input" type="month" value={month} onChange={e=>setMonth(e.target.value)} /></div>
      </div>
      <div className="card"><div className="flex items-center justify-between"><h2 className="font-semibold mb-2">Expenses by Category (This Month)</h2></div>
        <Doughnut data={donutData} options={chartOptions} />
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-white/80">
          {donutData.labels.map((label, i) => (<div key={i}><span className="legend-dot" style={{backgroundColor: (donutData.datasets[0] as any).backgroundColor[i]}}></span>{label}</div>))}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {barLabels.map((cur, i) => { const v = totalsMonth.get(cur) || { income:0, expense:0 };
          return (<div key={cur} className="card"><div className="text-sm text-white/70">{cur}</div><div className="text-3xl font-semibold mt-1">{fmt(v.income - v.expense, cur)}</div><div className="text-white/60 mt-2">Income {fmt(v.income, cur)} • Expense {fmt(v.expense, cur)}</div></div>);
        })}
        <div className="md:col-span-3 card"><Bar data={barData} options={chartOptions} /></div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card"><h2 className="font-semibold mb-2">New Account</h2>
          <form action={addAccount} className="space-y-2"><input name="name" className="input" placeholder="e.g. Wallet" required />
            <select name="currency" className="input" defaultValue={process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "SSP"}><option>SSP</option><option>USD</option><option>KES</option></select>
            <button className="btn w-full" type="submit">Add</button></form>
          <h3 className="mt-4 text-white/70">Accounts</h3>
          <ul className="mt-1 space-y-1">{(accounts.length===0)? <p className="text-white/60">No accounts yet — add your first account above.</p> : accounts.map(a => <li key={a.id} className="flex justify-between"><span>{a.name} <span className="badge">{a.currency}</span></span><span>{Number(a.balance||0).toFixed(2)}</span></li>)}</ul>
        </div>
        <div className="card"><h2 className="font-semibold mb-2">New Category</h2>
          <form action={addCategory} className="space-y-2"><input name="name" className="input" placeholder="e.g. Salary / Food" required />
            <select name="kind" className="input"><option value="income">Income</option><option value="expense">Expense</option></select>
            <button className="btn w-full" type="submit">Add</button></form>
          <h3 className="mt-4 text-white/70">Categories</h3>
          {(categories.length===0)? <p className="text-white/60">No categories yet — add a few to organize your transactions.</p> :
            <ul className="mt-1 space-y-1">{categories.map((c) => (<li key={c.id} className="flex justify-between"><span><span className="legend-dot" style={{backgroundColor: colorForId(c.id)}}></span>{c.name}</span><span className="badge">{c.kind}</span></li>))}</ul>}
        </div>
        <div className="card"><h2 className="font-semibold mb-2">New Transaction</h2>
          <form action={addTx} className="space-y-2">
            <select name="account_id" className="input" required><option value="">Select account…</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select>
            <select name="category_id" className="input"><option value="">No category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>)}</select>
            <select name="kind" className="input"><option>income</option><option>expense</option><option>transfer</option></select>
            <div className="grid grid-cols-2 gap-2"><input name="amount" className="input" type="number" step="0.01" placeholder="Amount" required /><select name="currency" className="input"><option>SSP</option><option>USD</option><option>KES</option></select></div>
            <input name="tx_date" className="input" type="date" required /><input name="note" className="input" placeholder="Note (optional)" /><button className="btn w-full" type="submit">Add</button>
          </form>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card"><h2 className="font-semibold mb-2">Monthly Balance (Income − Expense)</h2>
          <div className="grid grid-cols-3 gap-3">{["SSP","USD","KES"].map((cur) => { const v = totalsMonth.get(cur) || { income:0, expense:0 }; const bal = v.income - v.expense;
            return (<div key={cur} className="card"><div className="text-sm text-white/70">{cur}</div><div className="text-2xl font-semibold">{fmt(bal, cur)}</div></div>); })}</div>
        </div>
        <div className="card"><h2 className="font-semibold mb-2">Lifetime Balance (Income − Expense)</h2>
          <div className="grid grid-cols-3 gap-3">{["SSP","USD","KES"].map((cur) => { const v = totalsAll.get(cur) || { income:0, expense:0 }; const bal = v.income - v.expense;
            return (<div key={cur} className="card"><div className="text-sm text-white/70">{cur}</div><div className="text-2xl font-semibold">{fmt(bal, cur)}</div></div>); })}</div>
        </div>
      </div>
      <div className="card"><h2 className="font-semibold mb-2">Recent Transactions</h2>
        {(filteredTx.length===0)? <p className="text-white/60">No transactions found for this month.</p> :
        <table className="table"><thead><tr><th>Date</th><th>Account</th><th>Category</th><th>Kind</th><th>Amount</th><th>Currency</th><th>Note</th></tr></thead>
          <tbody>{filteredTx.map(tx => (<tr key={tx.id}><td>{tx.tx_date}</td><td>{accounts.find(a=>a.id===tx.account_id)?.name}</td><td>{categories.find(c=>c.id===tx.category_id||"")?.name || "-"}</td><td><span className="badge">{tx.kind}</span></td><td>{Number(tx.amount).toFixed(2)}</td><td>{tx.currency}</td><td>{tx.note || ""}</td></tr>))}</tbody>
        </table>}
      </div>
    </div>
  </RequireAuth>);
}

