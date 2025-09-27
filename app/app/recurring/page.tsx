"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";
import { fmt } from "@/lib/format";

import { useEffect, useState, FormEvent } from "react";

import { Doughnut } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

type Category = { id: string; name: string; kind: "income" | "expense" };
type Recurring = {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  frequency: "daily" | "weekly" | "monthly";
  start_date: string;
  next_run: string | null;
  user_id?: string;
};

const convert = (amount: number, from: string, to: "USD" | "SSP" | "KES") => {
  const ssp = from === "USD" ? amount * 6000 : from === "KES" ? amount * 46.5 : amount;
  if (to === "SSP") return ssp;
  if (to === "USD") return ssp / 6000;
  if (to === "KES") return ssp / 46.5;
  return ssp;
};

export default function RecurringPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [rules, setRules] = useState<Recurring[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Recurring>>({});
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");

  const fetchAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data: cData } = await supabase.from("categories").select("*");
    setCats(cData || []);

    let q = supabase
      .from("recurring")
      .select("*")
      .eq("user_id", user_id)
      .order("start_date", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (query) {
      const matchCats = (cData || []).filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      );
      const catIds = matchCats.map((c) => c.id);
      if (catIds.length > 0) q = q.in("category_id", catIds);
      else {
        setRules([]);
        return;
      }
    }

    const { data: rData } = await q;
    setRules(rData || []);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  const addRule = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) {
      setToast({ message: "❌ No logged-in user", type: "error" });
      return;
    }

    const { error } = await supabase.from("recurring").insert([
      {
        user_id,
        category_id: String(fd.get("category_id")),
        amount: Number(fd.get("amount")),
        currency: String(fd.get("currency")),
        frequency: String(fd.get("frequency")) as "daily" | "weekly" | "monthly",
        start_date: String(fd.get("start_date")),
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Recurring rule created" });
    fetchAll();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { error } = await supabase
      .from("recurring")
      .update({
        user_id,
        category_id: String(editDraft.category_id),
        amount: Number(editDraft.amount),
        currency: String(editDraft.currency),
        frequency: String(editDraft.frequency) as "daily" | "weekly" | "monthly",
        start_date: String(editDraft.start_date),
      })
      .eq("id", editingId)
      .eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Recurring rule updated" });

    setEditingId(null);
    setEditDraft({});
    fetchAll();
  };

  const delRule = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    if (!confirm("Delete this recurring rule?")) return;
    const { error } = await supabase.from("recurring").delete().eq("id", id).eq("user_id", user_id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Recurring rule deleted" });
    fetchAll();
  };

  const applyRule = async (id: string) => {
    setToast({ message: "✅ Rule applied (implement TX creation later)" });
  };

  // Chart data (converted to selected chartCurrency ONLY)
  const donut = {
    labels: rules.map((r) => cats.find((c) => c.id === r.category_id)?.name ?? "—"),
    datasets: [
      {
        data: rules.map((r) => convert(Number(r.amount), r.currency, chartCurrency)),
        backgroundColor: rules.map((_, i) => ["#22d3ee","#a78bfa","#fb7185","#34d399","#f59e0b","#f472b6","#84cc16","#e879f9","#f97316"][i % 9]),
      },
    ],
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Recurring Rules</h1>

        {/* Add Rule */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add Rule</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addRule(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-6 gap-2"
          >
            <select name="category_id" className="input">
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
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
            <select name="frequency" className="input">
              <option>daily</option>
              <option>weekly</option>
              <option>monthly</option>
            </select>
            <input name="start_date" type="date" className="input" required />
            <button className="btn">Save</button>
          </form>
        </div>

        {/* Search */}
        <div className="card flex items-center justify-between gap-3">
          <h3 className="font-semibold">Search Recurring Rules</h3>
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

        {/* Rules List */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">All Recurring Rules</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Frequency</th>
                <th>Start</th>
                <th>Next Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const catName = cats.find((c) => c.id === r.category_id)?.name ?? "—";
                const isEditing = editingId === r.id;
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    {!isEditing ? (
                      <>
                        <td>{catName}</td>
                        <td>{fmt(Number(r.amount), r.currency)}</td>
                        <td>{r.currency}</td>
                        <td>{r.frequency}</td>
                        <td>{r.start_date}</td>
                        <td>{r.next_run ?? "—"}</td>
                        <td>
                          <button
                            className="underline mr-2"
                            onClick={() => {
                              setEditingId(r.id);
                              setEditDraft(r);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="underline text-red-400 mr-2"
                            onClick={() => delRule(r.id)}
                          >
                            Delete
                          </button>
                          <button
                            className="underline text-green-400"
                            onClick={() => applyRule(r.id)}
                          >
                            Apply
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <select
                            value={String(editDraft.category_id)}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, category_id: e.target.value }))
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
                          <input
                            type="number"
                            className="input"
                            value={Number(editDraft.amount)}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, amount: Number(e.target.value) }))
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={String(editDraft.currency)}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, currency: e.target.value }))
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
                            value={String(editDraft.frequency)}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, frequency: e.target.value }))
                            }
                            className="input"
                          >
                            <option>daily</option>
                            <option>weekly</option>
                            <option>monthly</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            className="input"
                            value={String(editDraft.start_date)}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, start_date: e.target.value }))
                            }
                          />
                        </td>
                        <td>{r.next_run ?? "—"}</td>
                        <td>
                          <button className="underline mr-2" onClick={saveEdit}>
                            Save
                          </button>
                          <button
                            className="underline"
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
              disabled={rules.length < pageSize}
              className="btn"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Chart with currency toggle */}
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
        <div className="card">
          <h3 className="font-semibold mb-3">Recurring Totals ({chartCurrency})</h3>
          <Doughnut data={donut} />
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
