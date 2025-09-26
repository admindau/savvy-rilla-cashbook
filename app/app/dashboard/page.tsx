"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { fmt, currencies } from "@/lib/format";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: "income" | "expense" };
type Tx = {
  id: string;
  amount: number;
  currency: string;
  kind: string;
  tx_date: string;
  account_id: string;
  category_id: string | null;
  note: string | null;
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [showTotals, setShowTotals] = useState(false);

  // Fetch all data
  const fetchAll = async () => {
    const a = await supabase.from("accounts").select("*");
    if (!a.error) setAccounts(a.data || []);

    const c = await supabase.from("categories").select("*");
    if (!c.error) setCategories(c.data || []);

    const t = await supabase.from("transactions").select("*").order("tx_date", { ascending: false });
    if (!t.error) setTxs(t.data || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Lifetime balances
  const lifetime: Record<string, number> = {};
  txs.forEach((t) => {
    lifetime[t.currency] = (lifetime[t.currency] || 0) + (t.kind === "income" ? Number(t.amount) : -Number(t.amount));
  });

  // Monthly balances
  const month = new Date().toISOString().slice(0, 7);
  const monthly: Record<string, number> = {};
  txs.filter((t) => t.tx_date.startsWith(month)).forEach((t) => {
    monthly[t.currency] = (monthly[t.currency] || 0) + (t.kind === "income" ? Number(t.amount) : -Number(t.amount));
  });

  // Donut chart
  const donut = useMemo(() => {
    const map: Record<string, number> = {};
    txs.filter((t) => t.kind === "expense" && t.category_id).forEach((t) => {
      map[t.category_id!] = (map[t.category_id!] || 0) + Number(t.amount);
    });
    return {
      labels: categories.filter((c) => c.kind === "expense").map((c) => c.name),
      datasets: [
        {
          data: categories.filter((c) => c.kind === "expense").map((c) => map[c.id] || 0),
          backgroundColor: ["#22d3ee","#a78bfa","#fb7185","#34d399","#f59e0b","#f472b6","#84cc16","#e879f9","#f97316"],
        },
      ],
    };
  }, [categories, txs]);

  // Bar chart
  const bar = useMemo(() => {
    const data: Record<string, { income: number; expense: number }> = {};
    txs.forEach((t) => {
      if (!data[t.currency]) data[t.currency] = { income: 0, expense: 0 };
      if (t.kind === "income") data[t.currency].income += Number(t.amount);
      else data[t.currency].expense += Number(t.amount);
    });
    return {
      labels: Object.keys(data),
      datasets: [
        { label: "Income", data: Object.values(data).map((d) => d.income), backgroundColor: "#22c55e" },
        { label: "Expense", data: Object.values(data).map((d) => d.expense), backgroundColor: "#ef4444" },
      ],
    };
  }, [txs]);

  // Add transaction
  const addTx = async (form: FormData) => {
    const { error } = await supabase.from("transactions").insert({
      amount: Number(form.get("amount")),
      currency: String(form.get("currency")),
      kind: String(form.get("kind")),
      tx_date: String(form.get("tx_date")),
      account_id: String(form.get("account_id")),
      category_id: String(form.get("category_id")),
      note: String(form.get("note") || ""),
    });
    if (error) alert(error.message);
    else fetchAll();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">

        {/* Balances with toggle + glow */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`card cursor-pointer transition ${
              showTotals
                ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40"
                : "hover:bg-white/10"
            }`}
            onClick={() => setShowTotals(!showTotals)}
          >
            <h2 className="font-semibold mb-2">Balances (Lifetime)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(currencies as any).map((cur: string) => (
                <div key={cur} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(lifetime[cur] || 0, cur)}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`card cursor-pointer transition ${
              showTotals
                ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40"
                : "hover:bg-white/10"
            }`}
            onClick={() => setShowTotals(!showTotals)}
          >
            <h2 className="font-semibold mb-2">Balances (This Month)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(currencies as any).map((cur: string) => (
                <div key={cur} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(monthly[cur] || 0, cur)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Totals when expanded */}
        {showTotals && (
          <div className="text-sm text-white/80 mt-2">
            {(currencies as any).map((cur: string) => {
              const income = txs
                .filter((t) => t.currency === cur && t.kind === "income")
                .reduce((s, t) => s + Number(t.amount), 0);
              const expense = txs
                .filter((t) => t.currency === cur && t.kind === "expense")
                .reduce((s, t) => s + Number(t.amount), 0);
              const balance = income - expense;
              return (
                <div key={cur} className="mb-1">
                  <strong>{cur}</strong>: Balance {fmt(balance, cur)} | Income {fmt(income, cur)} | Expense {fmt(expense, cur)}
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

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="font-semibold mb-3">Recent Transactions</h3>
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
                </tr>
              </thead>
              <tbody>
                {txs.slice(0, 50).map((t) => (
                  <tr key={t.id} className="border-t border-white/10">
                    <td>{t.tx_date}</td>
                    <td>{accounts.find((a) => a.id === t.account_id)?.name}</td>
                    <td>{categories.find((c) => c.id === t.category_id)?.name}</td>
                    <td>{t.kind}</td>
                    <td>{fmt(Number(t.amount), t.currency)}</td>
                    <td>{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Transaction */}
        <div className="card">
          <h3 className="font-semibold mb-3">New Transaction</h3>
          <form
            action={addTx}
            className="grid md:grid-cols-2 gap-3"
          >
            <input name="amount" type="number" placeholder="Amount" required className="input" />
            <select name="currency" className="input">
              {(currencies as any).map((c: string) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input name="tx_date" type="date" required className="input" />
            <select name="account_id" className="input">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select name="category_id" className="input">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input name="note" placeholder="Note" className="input" />
            <button className="btn">Add</button>
          </form>
        </div>

        {/* Add Account */}
        <div className="card">
          <h3 className="font-semibold mb-3">New Account</h3>
          <form
            action={async (formData: FormData) => {
              const { error } = await supabase.from("accounts").insert({
                name: String(formData.get("name")),
                currency: String(formData.get("currency")),
              });
              if (error) alert(error.message);
              else fetchAll();
            }}
            className="grid md:grid-cols-2 gap-3"
          >
            <input name="name" placeholder="Name" required className="input" />
            <select name="currency" className="input">
              {(currencies as any).map((c: string) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="btn">Add</button>
          </form>
        </div>

        {/* Add Category */}
        <div className="card">
          <h3 className="font-semibold mb-3">New Category</h3>
          <form
            action={async (formData: FormData) => {
              const { error } = await supabase.from("categories").insert({
                name: String(formData.get("name")),
                kind: String(formData.get("kind")),
              });
              if (error) alert(error.message);
              else fetchAll();
            }}
            className="grid md:grid-cols-2 gap-3"
          >
            <input name="name" placeholder="Name" required className="input" />
            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button className="btn">Add</button>
          </form>
        </div>
      </div>
    </RequireAuth>
  );
}
