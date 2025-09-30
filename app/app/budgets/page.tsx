"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";
import { fmt } from "@/lib/format";
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

type Budget = {
  id: string;
  category_id: string;
  limit_amount: number;
  currency: string;
  month: string;
  user_id?: string;
};
type Category = { id: string; name: string; kind: "income" | "expense" };

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
  "#60a5fa",
  "#10b981",
  "#f43f5e",
];

export default function BudgetsPage() {
  const { convert, loading } = useFxRates();

  const [cats, setCats] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" } | null>(
    null
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Budget>>({});

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    // fetch both global + personal categories
    const { data: cData } = await supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user_id},user_id.is.null`);

    setCats(cData || []);

    // calculate start and end of month
    const start = month + "-01";
    const end = new Date(
      new Date(start).getFullYear(),
      new Date(start).getMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10);

    const { data: bData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user_id)
      .gte("month", start)
      .lte("month", end);

    setBudgets(bData || []);

    const { data: tData } = await supabase
      .from("transactions")
      .select("category_id,amount,kind,tx_date,currency")
      .eq("user_id", user_id)
      .gte("tx_date", start)
      .lte("tx_date", end);

    const m: Record<string, number> = {};
    (tData || []).forEach((t) => {
      if (t.kind === "expense" && t.category_id) {
        m[t.category_id] = (m[t.category_id] || 0) + Number(t.amount);
      }
    });
    setProgress(m);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, page, query]);

  const addBudget = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("budgets").insert([
      {
        user_id,
        category_id: String(fd.get("category_id")),
        limit_amount: Number(fd.get("limit_amount")),
        currency: String(fd.get("currency")),
        month: month + "-01",
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Budget created", type: "success" });
    load();
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const updated = {
      ...editDraft,
      user_id, // ensure user_id is always set
    };

    const { error } = await supabase
      .from("budgets")
      .update(updated)
      .eq("id", editingId)
      .eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Budget updated", type: "success" });

    setEditingId(null);
    setEditDraft({});
    load();
  };

  const delBudget = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Budget deleted", type: "success" });
    load();
  };

  // Trigger warning toasts for over-limit budgets
  useEffect(() => {
    budgets.forEach((b) => {
      const spent = progress[b.category_id] || 0;
      if (spent > b.limit_amount) {
        const cat = cats.find((c) => c.id === b.category_id)?.name ?? "—";
        setToast({ message: `⚠️ Over budget in ${cat}`, type: "warning" });
      }
    });
  }, [budgets, progress, cats]);

  const byCategory: Record<string, number> = {};
  budgets.forEach((b) => {
    byCategory[b.category_id] = convert(progress[b.category_id] || 0, b.currency, chartCurrency);
  });

  const donut = {
    labels: Object.keys(byCategory).map(
      (id) => cats.find((c) => c.id === id)?.name ?? "—"
    ),
    datasets: [{ data: Object.values(byCategory), backgroundColor: colors }],
  };

  const bar = {
    labels: Object.keys(byCategory).map(
      (id) => cats.find((c) => c.id === id)?.name ?? "—"
    ),
    datasets: [
      {
        label: "Spent",
        data: Object.keys(byCategory).map((id) => byCategory[id]),
        backgroundColor: "#ef4444",
      },
      {
        label: "Limit",
        data: budgets.map((b) => convert(b.limit_amount, b.currency, chartCurrency)),
        backgroundColor: "#22c55e",
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
            ⚡ Initializing Futuristic Budgets…
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <input
            className="input max-w-md"
            placeholder="🔍 Search by category..."
            value={query}
            onChange={(e) => {
              setPage(0);
              setQuery(e.target.value);
            }}
          />
        </div>

        {/* Add Budget */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Budget</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addBudget(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-4 gap-2"
          >
            <select name="category_id" className="input">
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="limit_amount"
              type="number"
              step="0.01"
              placeholder="Limit"
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

        {/* Budgets list */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">All Budgets</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Category</th>
                <th>Limit</th>
                <th>Currency</th>
                <th>Month</th>
                <th>Spent</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const cat = cats.find((c) => c.id === b.category_id)?.name ?? "—";
                const spent = progress[b.category_id] || 0;
                const pct = (spent / b.limit_amount) * 100;
                const over = spent > b.limit_amount;
                return (
                  <tr key={b.id} className="border-t border-white/10">
                    <td>{cat}</td>
                    <td>{fmt(b.limit_amount, b.currency)}</td>
                    <td>{b.currency}</td>
                    <td>{b.month.slice(0, 7)}</td>
                    <td>{fmt(spent, b.currency)}</td>
                    <td>
                      <div className="w-full bg-white/10 h-2 rounded">
                        <div
                          className={`h-2 rounded ${over ? "bg-red-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        className="text-cyan-400 hover:underline mr-2"
                        onClick={() => {
                          setEditingId(b.id);
                          setEditDraft(b);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-400 hover:underline"
                        onClick={() => delBudget(b.id)}
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
            <h3 className="font-semibold mb-3">Spent by Category ({chartCurrency})</h3>
            <Doughnut data={donut} />
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Spent vs Limit ({chartCurrency})</h3>
            <Bar data={bar} />
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
