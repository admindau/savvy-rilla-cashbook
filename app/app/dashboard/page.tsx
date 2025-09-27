"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { fmt } from "@/lib/format";
import Toast from "@/components/Toast";

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

type Tx = {
  id: string;
  amount: number;
  kind: "income" | "expense";
  currency: string;
  category_id: string | null;
  account_id?: string | null;
  tx_date: string;
  note?: string | null;
  user_id?: string;
};

type Category = { id: string; name: string };
type Account = { id: string; name: string; currency: string };

const colorList = [
  "#22d3ee", "#a78bfa", "#fb7185", "#34d399", "#f59e0b",
  "#f472b6", "#84cc16", "#e879f9", "#f97316",
];

const convert = (amount: number, from: string, to: "USD" | "SSP" | "KES") => {
  const ssp = from === "USD" ? amount * 6000 : from === "KES" ? amount * 46.5 : amount;
  if (to === "SSP") return ssp;
  if (to === "USD") return ssp / 6000;
  if (to === "KES") return ssp / 46.5;
  return ssp;
};

export default function DashboardPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [accts, setAccts] = useState<Account[]>([]);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");

  // balances (lifetime + monthly) kept per-currency (unchanged behavior)
  const [lifetime, setLifetime] = useState<Record<string, number>>({});
  const [monthly, setMonthly] = useState<Record<string, number>>({});

  const [showTotalsByCard, setShowTotalsByCard] = useState<Record<string, boolean>>({});

  const pageSize = 50;

  const load = async (pageArg = page, queryArg = query) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const [{ data: cData }, { data: aData }] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("accounts").select("*").eq("user_id", user_id),
    ]);
    setCats(cData || []);
    setAccts(aData || []);

    // search by category name
    let q = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user_id)
      .order("tx_date", { ascending: false })
      .range(pageArg * pageSize, pageArg * pageSize + pageSize - 1);

    if (queryArg) {
      const matchCats = (cData || []).filter((c) =>
        c.name.toLowerCase().includes(queryArg.toLowerCase())
      );
      const catIds = matchCats.map((c) => c.id);
      if (catIds.length > 0) {
        q = q.in("category_id", catIds);
      } else {
        // also try matching note (partial)
        q = supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user_id)
          .ilike("note", `%${queryArg}%`)
          .order("tx_date", { ascending: false })
          .range(pageArg * pageSize, pageArg * pageSize + pageSize - 1);
      }
    }

    const { data: tData } = await q;
    setTxs(tData || []);

    // balances per currency (lifetime + current month)
    const cur = new Date();
    const start = new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).toISOString().slice(0, 10);

    const { data: allTx } = await supabase
      .from("transactions")
      .select("amount, currency, kind, tx_date, user_id")
      .eq("user_id", user_id);

    const lifetimeMap: Record<string, number> = {};
    (allTx || []).forEach((t) => {
      lifetimeMap[t.currency] = lifetimeMap[t.currency] || 0;
      lifetimeMap[t.currency] += t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    });
    setLifetime(lifetimeMap);

    const { data: monthTx } = await supabase
      .from("transactions")
      .select("amount, currency, kind, tx_date, user_id")
      .eq("user_id", user_id)
      .gte("tx_date", start)
      .lte("tx_date", end);

    const monthMap: Record<string, number> = {};
    (monthTx || []).forEach((t) => {
      monthMap[t.currency] = monthMap[t.currency] || 0;
      monthMap[t.currency] += t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    });
    setMonthly(monthMap);
  };

  useEffect(() => {
    load(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  // Charts (converted to selected chartCurrency ONLY; other UI remains native currency)
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
    datasets: [
      {
        data: Object.values(byCategory),
        backgroundColor: colorList.slice(0, Object.keys(byCategory).length),
      },
    ],
  };

  const byCurrency: Record<string, { income: number; expense: number }> = {};
  txs.forEach((t) => {
    if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expense: 0 };
    byCurrency[t.currency][t.kind === "income" ? "income" : "expense"] += Number(t.amount);
  });

  const bar = {
    labels: Object.keys(byCurrency),
    datasets: [
      {
        label: "Income",
        data: Object.entries(byCurrency).map(([cur, v]) =>
          convert(v.income, cur, chartCurrency)
        ),
        backgroundColor: "#22c55e",
      },
      {
        label: "Expense",
        data: Object.entries(byCurrency).map(([cur, v]) =>
          convert(v.expense, cur, chartCurrency)
        ),
        backgroundColor: "#ef4444",
      },
    ],
  };

  // Add Transaction (kept simple here; your existing edit/delete handlers remain if you have them)
  const addTx = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    const { error } = await supabase.from("transactions").insert([
      {
        user_id,
        account_id: String(fd.get("account_id") || ""),
        category_id: String(fd.get("category_id") || ""),
        kind: String(fd.get("kind")) as "income" | "expense",
        amount: Number(fd.get("amount")),
        currency: String(fd.get("currency")),
        tx_date: String(fd.get("tx_date")),
        note: String(fd.get("note") || ""),
      },
    ]);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Transaction created" });
    load(page, query);
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Header + Search */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <input
            className="input max-w-md"
            placeholder="🔍 Search transactions..."
            value={query}
            onChange={(e) => {
              setPage(0);
              setQuery(e.target.value);
            }}
          />
        </div>

        {/* Balances (per-currency) in small fit font + per-card toggles for totals */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`card transition cursor-pointer ${
              Object.values(showTotalsByCard).some(Boolean)
                ? ""
                : "hover:bg-white/10"
            }`}
          >
            <h2 className="font-semibold mb-2">Balances (Lifetime)</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(lifetime).map((cur) => (
                <div
                  key={`life-${cur}`}
                  className={`card p-3 cursor-pointer ${
                    showTotalsByCard[`life-${cur}`] ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40" : ""
                  }`}
                  onClick={() =>
                    setShowTotalsByCard((m) => ({
                      ...m,
                      [`life-${cur}`]: !m[`life-${cur}`],
                    }))
                  }
                >
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(lifetime[cur] || 0, cur)}</div>
                  {showTotalsByCard[`life-${cur}`] && (
                    <div className="text-xs text-white/70 mt-1">
                      Total Income:{" "}
                      {fmt(
                        txs
                          .filter((t) => t.currency === cur && t.kind === "income")
                          .reduce((s, t) => s + Number(t.amount), 0),
                        cur
                      )}{" "}
                      · Total Expense:{" "}
                      {fmt(
                        txs
                          .filter((t) => t.currency === cur && t.kind === "expense")
                          .reduce((s, t) => s + Number(t.amount), 0),
                        cur
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-2">Balances (This month)</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(monthly).map((cur) => (
                <div key={`mon-${cur}`} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(monthly[cur] || 0, cur)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts with currency toggle */}
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
            <h3 className="font-semibold mb-3">
              Expenses by Category ({chartCurrency})
            </h3>
            <Doughnut data={donut} />
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">
              Income vs Expense (per currency) ({chartCurrency})
            </h3>
            <Bar data={bar} />
          </div>
        </div>

        {/* Add Transaction */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Transaction</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addTx(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-7 gap-2"
          >
            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input className="input" name="amount" type="number" step="0.01" placeholder="Amount" required />
            <select className="input" name="currency">
              <option>SSP</option>
              <option>USD</option>
              <option>KES</option>
            </select>
            <select name="account_id" className="input">
              {accts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
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
            <input className="input" name="tx_date" type="date" required />
            <input className="input md:col-span-2" name="note" placeholder="Note (optional)" />
            <button className="btn md:col-span-1">Save</button>
          </form>
        </div>

        {/* Transactions table (with pagination) */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">Recent Transactions</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Date</th>
                <th>Kind</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Category</th>
                <th>Account</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const cat = cats.find((c) => c.id === t.category_id)?.name ?? "—";
                const acc = accts.find((a) => a.id === t.account_id)?.name ?? "—";
                return (
                  <tr key={t.id} className="border-t border-white/10">
                    <td>{t.tx_date}</td>
                    <td className={t.kind === "income" ? "text-green-400" : "text-red-400"}>
                      {t.kind}
                    </td>
                    <td>{fmt(Number(t.amount), t.currency)}</td>
                    <td>{t.currency}</td>
                    <td>{cat}</td>
                    <td>{acc}</td>
                    <td>{t.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-3">
            <button
              disabled={page === 0}
              className="btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span className="text-white/70">Page {page + 1}</span>
            <button
              disabled={txs.length < pageSize}
              className="btn"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </RequireAuth>
  );
}
