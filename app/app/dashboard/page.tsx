"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { fmt } from "@/lib/format";
import Toast from "@/components/Toast";
import { useEffect, useState, FormEvent } from "react";
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

type Tx = {
  id: string;
  amount: number;
  kind: "income" | "expense";
  currency: string;
  category_id: string | null;
  account_id: string | null;
  tx_date: string;
  note: string | null;
  user_id?: string;
};
type Category = { id: string; name: string };
type Account = { id: string; name: string; currency: string };

const colors = [
  "#22d3ee",
  "#a78bfa",
  "#fb7185",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#84cc16",
  "#e879f9",
  "#f97316",
];

export default function DashboardPage() {
  const { convert, loading } = useFxRates();

  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [accts, setAccts] = useState<Account[]>([]);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const pageSize = 50;

  const [lifetime, setLifetime] = useState<Record<string, number>>({});
  const [monthly, setMonthly] = useState<Record<string, number>>({});

  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(
    null
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Tx>>({});

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
      if (catIds.length > 0) q = q.in("category_id", catIds);
      else q = q.ilike("note", `%${queryArg}%`);
    }

    const { data: tData } = await q;
    setTxs(tData || []);

    const cur = new Date();
    const start = new Date(cur.getFullYear(), cur.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const { data: allTx } = await supabase
      .from("transactions")
      .select("amount,currency,kind,tx_date")
      .eq("user_id", user_id);
    const life: Record<string, number> = {};
    (allTx || []).forEach((t) => {
      life[t.currency] = life[t.currency] || 0;
      life[t.currency] +=
        t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    });
    setLifetime(life);

    const { data: monthTx } = await supabase
      .from("transactions")
      .select("amount,currency,kind,tx_date")
      .eq("user_id", user_id)
      .gte("tx_date", start)
      .lte("tx_date", end);
    const mon: Record<string, number> = {};
    (monthTx || []).forEach((t) => {
      mon[t.currency] = mon[t.currency] || 0;
      mon[t.currency] +=
        t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    });
    setMonthly(mon);
  };

  useEffect(() => {
    load(0, "");
  }, []);
  useEffect(() => {
    load(page, query);
  }, [page, query]); // eslint-disable-line

  if (loading) return <div className="animate-pulse text-white/60">Loading…</div>;

  const byCategory: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.kind === "expense" && t.category_id) {
      byCategory[t.category_id] =
        (byCategory[t.category_id] || 0) +
        convert(Number(t.amount), t.currency, chartCurrency);
    }
  });
  const donut = {
    labels: Object.keys(byCategory).map(
      (id) => cats.find((c) => c.id === id)?.name ?? "—"
    ),
    datasets: [
      { data: Object.values(byCategory), backgroundColor: colors },
    ],
  };

  const byCurrency: Record<string, { income: number; expense: number }> = {};
  txs.forEach((t) => {
    if (!byCurrency[t.currency])
      byCurrency[t.currency] = { income: 0, expense: 0 };
    byCurrency[t.currency][
      t.kind === "income" ? "income" : "expense"
    ] += Number(t.amount);
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
    load(page, query);
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
    load(page, query);
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
    load(page, query);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    const { error } = await supabase
      .from("transactions")
      .update({
        user_id,
        account_id: String(editDraft.account_id),
        category_id: String(editDraft.category_id),
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
    load(page, query);
  };

  const delTx = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Transaction deleted" });
    load(page, query);
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Search */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <input
            className="input max-w-md"
            placeholder="🔍 Search by category or note..."
            value={query}
            onChange={(e) => {
              setPage(0);
              setQuery(e.target.value);
            }}
          />
        </div>

        {/* Balances */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold mb-2">Balances (Lifetime)</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(lifetime).map((cur) => (
                <div key={`life-${cur}`} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(lifetime[cur] || 0, cur)}</div>
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

        {/* Charts + FX toggle */}
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
              Income vs Expense ({chartCurrency})
            </h3>
            <Bar data={bar} />
          </div>
        </div>

        {/* Add Account */}
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
            <input name="name" placeholder="Account name" required className="input" />
            <select name="currency" className="input">
              <option>SSP</option>
              <option>USD</option>
              <option>KES</option>
            </select>
            <button className="btn">Save</button>
          </form>
        </div>

        {/* Add Category */}
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
            <input name="note" placeholder="Note (optional)" className="input md:col-span-2" />
            <button className="btn md:col-span-1">Save</button>
          </form>
        </div>

        {/* Recent Transactions */}
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
                        <td>
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
                            value={editDraft.tx_date}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, tx_date: e.target.value })
                            }
                            className="input"
                          />
                        </td>
                        <td>
                          <select
                            value={editDraft.kind}
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
                            value={editDraft.amount}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, amount: Number(e.target.value) })
                            }
                            className="input"
                          />
                        </td>
                        <td>
                          <select
                            value={editDraft.currency}
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
                            value={editDraft.category_id ?? ""}
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
                            value={editDraft.account_id ?? ""}
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
                            value={editDraft.note ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, note: e.target.value })
                            }
                            className="input"
                          />
                        </td>
                        <td>
                          <button
                            className="btn bg-cyan-600 mr-2"
                            onClick={saveEdit}
                          >
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

          <div className="flex justify-between mt-2 text-sm">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="btn"
            >
              Previous
            </button>
            <button
              disabled={txs.length < pageSize}
              onClick={() => setPage(page + 1)}
              className="btn"
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
