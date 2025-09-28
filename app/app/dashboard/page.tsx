"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";
import { fmt } from "@/lib/format";
import { useFxRates } from "@/lib/useFxRates";
import { useEffect, useState, FormEvent } from "react";

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
  account_id: string;
  category_id: string;
  amount: number;
  currency: string;
  kind: "income" | "expense";
  tx_date: string;
  note?: string;
};

export default function DashboardPage() {
  const { convert, loading } = useFxRates();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [lifetime, setLifetime] = useState<Record<string, number>>({});
  const [monthly, setMonthly] = useState<Record<string, number>>({});
  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data: aData } = await supabase.from("accounts").select("*").eq("user_id", user_id);
    setAccounts(aData || []);

    const { data: cData } = await supabase.from("categories").select("*");
    setCats(cData || []);

    const { data: tData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user_id)
      .order("tx_date", { ascending: false })
      .limit(50);
    setTxs(tData || []);

    // compute balances
    const life: Record<string, number> = {};
    (tData || []).forEach((t) => {
      life[t.currency] = (life[t.currency] || 0) + Number(t.amount) * (t.kind === "income" ? 1 : -1);
    });
    setLifetime(life);

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthAgg: Record<string, number> = {};
    (tData || [])
      .filter((t) => t.tx_date.startsWith(thisMonth))
      .forEach((t) => {
        monthAgg[t.currency] =
          (monthAgg[t.currency] || 0) + Number(t.amount) * (t.kind === "income" ? 1 : -1);
      });
    setMonthly(monthAgg);
  };

  useEffect(() => {
    load();
  }, []);

  const addAccount = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("accounts").insert([
      {
        user_id: userData?.user?.id,
        name: String(fd.get("name")),
        currency: String(fd.get("currency")),
      },
    ]);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Account created", type: "success" });
    load();
  };

  const addCategory = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("categories").insert([
      {
        user_id: userData?.user?.id,
        name: String(fd.get("name")),
        kind: String(fd.get("kind")),
      },
    ]);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Category created", type: "success" });
    load();
  };

  const addTx = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("transactions").insert([
      {
        user_id: userData?.user?.id,
        account_id: String(fd.get("account_id")),
        category_id: String(fd.get("category_id")),
        amount: Number(fd.get("amount")),
        currency: String(fd.get("currency")),
        kind: String(fd.get("kind")) as "income" | "expense",
        tx_date: String(fd.get("tx_date")),
        note: String(fd.get("note") || ""),
      },
    ]);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Transaction created", type: "success" });
    load();
  };

  const delTx = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Transaction deleted", type: "success" });
    load();
  };

  // Chart data
  const byCategory: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.kind === "expense" && t.category_id) {
      byCategory[t.category_id] =
        (byCategory[t.category_id] || 0) + convert(Number(t.amount), t.currency, chartCurrency);
    }
  });

  const donut = {
    labels: Object.keys(byCategory).map(
      (id) => cats.find((c) => c.id === id)?.name ?? "—"
    ),
    datasets: [{ data: Object.values(byCategory), backgroundColor: ["#22d3ee", "#a78bfa", "#fb7185", "#34d399", "#f59e0b", "#f472b6", "#84cc16"] }],
  };

  const bar = {
    labels: ["Income", "Expense"],
    datasets: [
      {
        label: "Income",
        data: [
          txs
            .filter((t) => t.kind === "income")
            .reduce((s, t) => s + convert(Number(t.amount), t.currency, chartCurrency), 0),
        ],
        backgroundColor: "#22c55e",
      },
      {
        label: "Expense",
        data: [
          txs
            .filter((t) => t.kind === "expense")
            .reduce((s, t) => s + convert(Number(t.amount), t.currency, chartCurrency), 0),
        ],
        backgroundColor: "#ef4444",
      },
    ],
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative">
            <div className="w-20 h-20 rounded-full blur-xl animate-pulse bg-cyan-500/30" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border border-cyan-400 animate-[pulse_1.8s_ease-in-out_infinite]" />
          </div>
          <div className="mt-6 text-cyan-300 tracking-widest">
            ⚡ Initializing Futuristic Dashboard…
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Balances */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: "Balances (Lifetime)", data: lifetime },
            { title: "Balances (This month)", data: monthly },
          ].map((section) => (
            <div
              key={section.title}
              className={`card cursor-pointer transition ${
                expanded === section.title
                  ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40"
                  : "hover:bg-white/10"
              }`}
              onClick={() =>
                setExpanded(expanded === section.title ? null : section.title)
              }
            >
              <h2 className="font-semibold mb-2">{section.title}</h2>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-3 gap-2 min-w-[300px]">
                  {Object.keys(section.data).map((cur) => (
                    <div key={cur} className="card p-3">
                      <div className="text-xs text-white/70">{cur}</div>
                      <div className="truncate text-sm sm:text-base md:text-lg font-mono">
                        {fmt(section.data[cur] || 0, cur)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {expanded === section.title && (
                <div className="text-sm text-white/80 mt-2">
                  {Object.keys(section.data).map((cur) => (
                    <div key={cur} className="mb-1">
                      <strong>{cur}</strong>: {fmt(section.data[cur] || 0, cur)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="flex justify-end gap-2">
          {(["SSP", "USD", "KES"] as const).map((c) => (
            <button
              key={c}
              className={`btn ${chartCurrency === c ? "bg-cyan-600" : ""}`}
              onClick={() => setChartCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Expenses by Category ({chartCurrency})</h3>
            <Doughnut data={donut} />
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Income vs Expense ({chartCurrency})</h3>
            <Bar data={bar} />
          </div>
        </div>

        {/* Add Account */}
        <div className="card">
          <h2 className="font-semibold mb-2">New Account</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addAccount(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-3 gap-2"
          >
            <input name="name" placeholder="Account name" required className="input" />
            <select name="currency" className="input">
              <option>SSP</option>
              <option>USD</option>
              <option>KES</option>
            </select>
            <button className="btn">Save</button>
          </form>
        </div>

        {/* New Category */}
        <div className="card">
          <h2 className="font-semibold mb-2">New Category</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addCategory(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-3 gap-2"
          >
            <input name="name" placeholder="Category name" required className="input" />
            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button className="btn">Save</button>
          </form>
        </div>

        {/* Add Transaction */}
        <div className="card">
          <h2 className="font-semibold mb-2">New Transaction</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addTx(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-6 gap-2"
          >
            <select name="account_id" className="input">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select name="category_id" className="input">
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="amount" type="number" step="0.01" placeholder="Amount" required className="input" />
            <select name="currency" className="input">
              <option>SSP</option>
              <option>USD</option>
              <option>KES</option>
            </select>
            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input name="tx_date" type="date" required className="input" />
            <input name="note" placeholder="Note (optional)" className="input md:col-span-6" />
            <button className="btn md:col-span-6">Save</button>
          </form>
        </div>

        {/* Recent Transactions */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">Recent Transactions</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Account</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Kind</th>
                <th>Date</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const acc = accounts.find((a) => a.id === t.account_id)?.name ?? "—";
                const cat = cats.find((c) => c.id === t.category_id)?.name ?? "—";
                return (
                  <tr key={t.id} className="border-t border-white/10">
                    <td>{acc}</td>
                    <td>{cat}</td>
                    <td>{fmt(t.amount, t.currency)}</td>
                    <td>{t.currency}</td>
                    <td>{t.kind}</td>
                    <td>{t.tx_date}</td>
                    <td>{t.note || "—"}</td>
                    <td>
                      <button
                        className="text-red-400 hover:underline"
                        onClick={() => delTx(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
