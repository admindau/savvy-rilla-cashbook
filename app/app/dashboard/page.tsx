"use client";

/**
 * Savvy Rilla Cashbook — Dashboard
 * - Balances (Lifetime + Monthly) — per currency cards, independently clickable for breakdown
 * - Charts: Expenses by Category (Donut), Income vs Expense per currency (Bar) with FX toggle
 * - Add Account / Add Category / Add Transaction
 * - Recent Transactions: search, pagination (50/page), edit, delete
 * - Futuristic loader + toasts
 * - Mobile-friendly balances (no overflow)
 */

import { useEffect, useMemo, useState, FormEvent } from "react";

import RequireAuth from "@/components/RequireAuth";
import Toast from "@/components/Toast";

import { supabase } from "@/lib/supabaseClient";
import { fmt } from "@/lib/format";
import { useFxRates } from "@/lib/useFxRates";

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

/* ===============================
   Types
================================= */

type Account = {
  id: string;
  user_id?: string;
  name: string;
  currency: "SSP" | "USD" | "KES" | string;
};

type Category = {
  id: string;
  user_id?: string;
  name: string;
  kind?: "income" | "expense";
};

type Tx = {
  id: string;
  user_id?: string;
  account_id: string | null;
  category_id: string | null;
  amount: number;
  currency: "SSP" | "USD" | "KES" | string;
  kind: "income" | "expense";
  tx_date: string;
  note: string | null;
};

/* ===============================
   Palette (colorful + consistent)
================================= */

const palette = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#fb7185", // rose
  "#34d399", // emerald
  "#f59e0b", // amber
  "#f472b6", // pink
  "#84cc16", // lime
  "#e879f9", // fuchsia
  "#f97316", // orange
  "#60a5fa", // blue
  "#10b981", // green
  "#f43f5e", // red
];

/* ===============================
   Component
================================= */

export default function DashboardPage() {
  /* --------------------------------
     Hooks
  ---------------------------------- */
  const { convert, loading } = useFxRates();

  /* --------------------------------
     Local state
  ---------------------------------- */
  const [accts, setAccts] = useState<Account[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const pageSize = 50;

  // balances
  const [lifetime, setLifetime] = useState<Record<string, number>>({});
  const [monthly, setMonthly] = useState<Record<string, number>>({});

  // FX toggle for charts
  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");

  // independent breakdown toggles for each currency (lifetime section only)
  const [showBreakdown, setShowBreakdown] = useState<Record<string, boolean>>({});

  // editing state for recent transactions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Tx>>({});

  // toast
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(
    null
  );

  /* --------------------------------
     Data loader
  ---------------------------------- */
  const load = async (pageArg = page, queryArg = query) => {
    // current user
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    // fetch categories + accounts
    const [{ data: cData, error: cErr }, { data: aData, error: aErr }] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("accounts").select("*").eq("user_id", user_id),
    ]);

    if (cErr) setToast({ message: cErr.message, type: "error" });
    if (aErr) setToast({ message: aErr.message, type: "error" });

    setCats(cData || []);
    setAccts(aData || []);

    // transactions (paged, searchable)
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

      // If found matching categories, filter by category; otherwise try note/currency
      if (catIds.length > 0) {
        q = q.in("category_id", catIds);
      } else {
        q = q.or(`note.ilike.%${queryArg}%,currency.ilike.%${queryArg}%`);
      }
    }

    const { data: tData, error: tErr } = await q;
    if (tErr) setToast({ message: tErr.message, type: "error" });

    setTxs(tData || []);

    // compute lifetime balances (across all time)
    const { data: allTx, error: allErr } = await supabase
      .from("transactions")
      .select("amount,currency,kind")
      .eq("user_id", user_id);
    if (allErr) setToast({ message: allErr.message, type: "error" });

    const life: Record<string, number> = {};
    (allTx || []).forEach((t) => {
      life[t.currency] = life[t.currency] || 0;
      life[t.currency] += t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    });
    setLifetime(life);

    // compute monthly balances (current month only)
    const cur = new Date();
    const start = new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).toISOString().slice(0, 10);

    const { data: monthTx, error: monthErr } = await supabase
      .from("transactions")
      .select("amount,currency,kind,tx_date")
      .eq("user_id", user_id)
      .gte("tx_date", start)
      .lte("tx_date", end);
    if (monthErr) setToast({ message: monthErr.message, type: "error" });

    const mon: Record<string, number> = {};
    (monthTx || []).forEach((t) => {
      mon[t.currency] = mon[t.currency] || 0;
      mon[t.currency] += t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    });
    setMonthly(mon);
  };

  useEffect(() => {
    load(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  /* --------------------------------
     Helpers
  ---------------------------------- */

  // per-currency breakdown (lifetime)
  const breakdown = (currency: string) => {
    const income = txs
      .filter((t) => t.currency === currency && t.kind === "income")
      .reduce((s, t) => s + Number(t.amount), 0);

    const expense = txs
      .filter((t) => t.currency === currency && t.kind === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);

    const balance = lifetime[currency] || 0;

    return { income, expense, balance };
  };

  // Chart: donut by expense category (converted to chartCurrency)
  const donut = useMemo(() => {
    const byCategory: Record<string, number> = {};

    txs.forEach((t) => {
      if (t.kind === "expense" && t.category_id) {
        byCategory[t.category_id] =
          (byCategory[t.category_id] || 0) + convert(Number(t.amount), t.currency, chartCurrency);
      }
    });

    const labels = Object.keys(byCategory).map(
      (id) => cats.find((c) => c.id === id)?.name ?? "—"
    );
    const data = Object.values(byCategory);

    return {
      labels,
      datasets: [{ data, backgroundColor: palette }],
    };
  }, [txs, cats, chartCurrency, convert]);

  // Chart: bar — per-currency totals (income vs expense), converted to chartCurrency
  const bar = useMemo(() => {
    const byCurrency: Record<string, { income: number; expense: number }> = {};

    txs.forEach((t) => {
      if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expense: 0 };
      byCurrency[t.currency][t.kind === "income" ? "income" : "expense"] += Number(t.amount);
    });

    const labels = Object.keys(byCurrency);
    const incomeSeries = labels.map((cur) => convert(byCurrency[cur].income, cur, chartCurrency));
    const expenseSeries = labels.map((cur) => convert(byCurrency[cur].expense, cur, chartCurrency));

    return {
      labels,
      datasets: [
        { label: "Income", data: incomeSeries, backgroundColor: "#22c55e" },
        { label: "Expense", data: expenseSeries, backgroundColor: "#ef4444" },
      ],
    };
  }, [txs, chartCurrency, convert]);

  /* --------------------------------
     Actions (insert/update/delete)
  ---------------------------------- */

  const addAccount = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("accounts").insert([
      {
        user_id,
        name: String(fd.get("name")),
        currency: String(fd.get("currency")),
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Account created" });

    (document.activeElement as HTMLElement)?.blur();
    await load(page, query);
  };

  const addCategory = async (fd: FormData) => {
    const { error } = await supabase.from("categories").insert([
      {
        name: String(fd.get("name")),
        kind: String(fd.get("kind")) as "income" | "expense",
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Category created" });

    (document.activeElement as HTMLElement)?.blur();
    await load(page, query);
  };

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

    (document.activeElement as HTMLElement)?.blur();
    await load(page, query);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase
      .from("transactions")
      .update({
        user_id,
        account_id: String(editDraft.account_id || ""),
        category_id: String(editDraft.category_id || ""),
        kind: editDraft.kind as "income" | "expense",
        amount: Number(editDraft.amount),
        currency: String(editDraft.currency),
        tx_date: String(editDraft.tx_date),
        note: String(editDraft.note || ""),
      })
      .eq("id", editingId)
      .eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Transaction updated" });

    setEditingId(null);
    setEditDraft({});
    await load(page, query);
  };

  const delTx = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;

    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Transaction deleted" });

    await load(page, query);
  };

  /* --------------------------------
     Loader (futuristic)
  ---------------------------------- */

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

  /* --------------------------------
     Render
  ---------------------------------- */

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-semibold">Dashboard</h1>

          <input
            className="input max-w-xl"
            placeholder="🔍 Search by category, currency or note..."
            value={query}
            onChange={(e) => {
              setPage(0);
              setQuery(e.target.value);
            }}
          />
        </div>

        {/* =========================
            Balances (Lifetime/Monthly)
            - Mobile-friendly
            - Independent per-currency breakdown (Lifetime)
        ========================== */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Lifetime */}
          <div className="card">
            <h2 className="font-semibold mb-2">Balances (Lifetime)</h2>

            {/* horizontal scroll on very small screens to prevent overflow */}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-3 gap-2 min-w-[320px]">
                {Object.keys(lifetime).map((cur) => {
                  const open = !!showBreakdown[cur];

                  return (
                    <div
                      key={`life-${cur}`}
                      className={`card p-3 cursor-pointer transition ${
                        open
                          ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40"
                          : "hover:bg-white/10"
                      }`}
                      onClick={() =>
                        setShowBreakdown((prev) => ({
                          ...prev,
                          [cur]: !prev[cur],
                        }))
                      }
                      title={`Click to ${open ? "hide" : "show"} breakdown`}
                    >
                      <div className="text-xs text-white/70">{cur}</div>

                      {/* responsive amount that never spills */}
                      <div className="font-mono tracking-tight whitespace-nowrap overflow-hidden text-ellipsis text-sm sm:text-base md:text-lg">
                        {fmt(lifetime[cur] || 0, cur)}
                      </div>

                      {/* independent breakdown */}
                      {open && (
                        <div className="mt-2 text-xs text-white/80 space-y-1">
                          {(() => {
                            const { income, expense, balance } = breakdown(cur);
                            return (
                              <>
                                <div>Income: {fmt(income, cur)}</div>
                                <div>Expense: {fmt(expense, cur)}</div>
                                <div>Net: {fmt(balance, cur)}</div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* This month */}
          <div className="card">
            <h2 className="font-semibold mb-2">Balances (This month)</h2>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-3 gap-2 min-w-[320px]">
                {Object.keys(monthly).map((cur) => (
                  <div key={`mon-${cur}`} className="card p-3">
                    <div className="text-xs text-white/70">{cur}</div>

                    {/* responsive amount that never spills */}
                    <div className="font-mono tracking-tight whitespace-nowrap overflow-hidden text-ellipsis text-sm sm:text-base md:text-lg">
                      {fmt(monthly[cur] || 0, cur)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            Charts + FX toggle
        ========================== */}
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
            <h3 className="font-semibold mb-3">Income vs Expense (per currency, {chartCurrency})</h3>
            <Bar data={bar} />
          </div>
        </div>

        {/* =========================
            Add Account
        ========================== */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Account</h2>

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addAccount(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-3 gap-2"
          >
            <input
              name="name"
              placeholder="Account name"
              required
              className="input"
            />

            <select name="currency" className="input">
              <option>SSP</option>
              <option>USD</option>
              <option>KES</option>
            </select>

            <button className="btn">Save</button>
          </form>
        </div>

        {/* =========================
            Add Category
        ========================== */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Category</h2>

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addCategory(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-3 gap-2"
          >
            <input
              name="name"
              placeholder="Category name"
              required
              className="input"
            />

            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <button className="btn">Save</button>
          </form>
        </div>

        {/* =========================
            Add Transaction
        ========================== */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Transaction</h2>

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addTx(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-8 gap-2"
          >
            <select name="kind" className="input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <input
              name="amount"
              type="number"
              step="0.01"
              placeholder="Amount"
              required
              className="input"
            />

            <select name="currency" className="input">
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

            <input name="tx_date" type="date" required className="input" />

            <input
              name="note"
              placeholder="Note (optional)"
              className="input md:col-span-2"
            />

            <button className="btn md:col-span-1">Save</button>
          </form>
        </div>

        {/* =========================
            Recent Transactions
            - Search reacts above (server-side refetch)
            - 50 per page
            - Edit + Delete
        ========================== */}
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
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {txs.map((t) => {
                const cat = cats.find((c) => c.id === t.category_id)?.name ?? "—";
                const acc = accts.find((a) => a.id === t.account_id)?.name ?? "—";
                const isEditing = editingId === t.id;

                return (
                  <tr key={t.id} className="border-t border-white/10">
                    {!isEditing ? (
                      <>
                        <td>{t.tx_date}</td>
                        <td className={t.kind === "income" ? "text-green-400" : "text-red-400"}>
                          {t.kind}
                        </td>
                        <td>{fmt(Number(t.amount), t.currency)}</td>
                        <td>{t.currency}</td>
                        <td>{cat}</td>
                        <td>{acc}</td>
                        <td>{t.note ?? "—"}</td>
                        <td className="whitespace-nowrap">
                          <button
                            className="text-cyan-400 hover:underline mr-2"
                            onClick={() => {
                              setEditingId(t.id);
                              setEditDraft(t);
                            }}
                          >
                            Edit
                          </button>

                          <button
                            className="text-red-400 hover:underline"
                            onClick={() => delTx(t.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <input
                            type="date"
                            value={editDraft.tx_date || ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, tx_date: e.target.value })
                            }
                            className="input"
                          />
                        </td>

                        <td>
                          <select
                            value={editDraft.kind as "income" | "expense"}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                kind: e.target.value as "income" | "expense",
                              })
                            }
                            className="input"
                          >
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                          </select>
                        </td>

                        <td>
                          <input
                            type="number"
                            value={Number(editDraft.amount ?? 0)}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                amount: Number(e.target.value),
                              })
                            }
                            className="input"
                          />
                        </td>

                        <td>
                          <select
                            value={String(editDraft.currency || "SSP")}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, currency: e.target.value })
                            }
                            className="input"
                          >
                            <option>SSP</option>
                            <option>USD</option>
                            <option>KES</option>
                          </select>
                        </td>

                        <td>
                          <select
                            value={String(editDraft.category_id || "")}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, category_id: e.target.value })
                            }
                            className="input"
                          >
                            {cats.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <select
                            value={String(editDraft.account_id || "")}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, account_id: e.target.value })
                            }
                            className="input"
                          >
                            {accts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            type="text"
                            value={String(editDraft.note || "")}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, note: e.target.value })
                            }
                            className="input"
                          />
                        </td>

                        <td className="whitespace-nowrap">
                          <button className="btn bg-cyan-600 mr-2" onClick={saveEdit}>
                            Save
                          </button>
                          <button
                            className="btn bg-gray-600"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft({});
                            }}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between mt-2 text-sm">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn"
            >
              Previous
            </button>

            <button
              disabled={txs.length < pageSize}
              onClick={() => setPage((p) => p + 1)}
              className="btn"
            >
              Next
            </button>
          </div>
        </div>

        {/* Global toast */}
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
