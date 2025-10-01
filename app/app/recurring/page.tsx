"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";
import { fmt } from "@/lib/format";
import { useEffect, useState, FormEvent } from "react";
import { useFxRates } from "@/lib/useFxRates";

import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

type Recurring = {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  frequency: "daily" | "weekly" | "monthly";
  start_date: string;
  next_run: string | null;
  note?: string | null;
  user_id?: string;
};
type Category = { id: string; name: string };

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

export default function RecurringPage() {
  const { convert, loading } = useFxRates();

  const [rules, setRules] = useState<Recurring[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(
    null
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Recurring>>({});

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data: cData } = await supabase.from("categories").select("*");
    setCats(cData || []);

    let q = supabase
      .from("recurring")
      .select("*")
      .eq("user_id", user_id)
      .order("start_date", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (query) {
      const matchCats = (cData || []).filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      );
      const catIds = matchCats.map((c) => c.id);
      if (catIds.length > 0) q = q.in("category_id", catIds);
      else q = q.ilike("note", `%${query}%`);
    }

    const { data } = await q;
    setRules(data || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  const addRule = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("recurring").insert([
      {
        user_id,
        category_id: String(fd.get("category_id")),
        amount: Number(fd.get("amount")),
        currency: String(fd.get("currency")),
        frequency: String(fd.get("frequency")),
        start_date: String(fd.get("start_date")),
        note: String(fd.get("note") || ""),
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Rule created" });
    load();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase
      .from("recurring")
      .update(editDraft)
      .eq("id", editingId)
      .eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Rule updated" });
    setEditingId(null);
    setEditDraft({});
    load();
  };

  const delRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("recurring").delete().eq("id", id).eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Rule deleted" });
    load();
  };

  // ✅ FIXED: Apply recurring as transaction using txn_date
  const applyRule = async (rule: Recurring) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { error } = await supabase.from("transactions").insert([
      {
        user_id,
        category_id: rule.category_id,
        amount: rule.amount,
        currency: rule.currency,
        txn_date: rule.start_date,   // ✅ updated to match DB column name
        note: rule.note ?? "",
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "📌 Recurring applied to transactions" });
  };

  // Chart: by category
  const byCategory: Record<string, number> = {};
  rules.forEach((r) => {
    if (r.category_id) {
      byCategory[r.category_id] =
        (byCategory[r.category_id] || 0) +
        convert(Number(r.amount), r.currency, "SSP");
    }
  });

  const donut = {
    labels: Object.keys(byCategory).map(
      (id) => cats.find((c) => c.id === id)?.name ?? "—"
    ),
    datasets: [{ data: Object.values(byCategory), backgroundColor: colors }],
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-pulse text-cyan-400 text-lg tracking-widest">
          ⚡ Initializing Futuristic Recurring…
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Recurring</h1>
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
            <input name="amount" type="number" step="0.01" placeholder="Amount" required className="input" />
            <select name="currency" className="input">
              <option>SSP</option>
              <option>USD</option>
              <option>KES</option>
            </select>
            <select name="frequency" className="input">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input name="start_date" type="date" required className="input" />
            <input name="note" placeholder="Note (optional)" className="input" />
            <button className="btn md:col-span-6">Save</button>
          </form>
        </div>

        {/* Rules list */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">All Rules</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Frequency</th>
                <th>Start Date</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const cat = cats.find((c) => c.id === r.category_id)?.name ?? "—";
                const isEditing = editingId === r.id;
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    {!isEditing ? (
                      <>
                        <td>{cat}</td>
                        <td>{fmt(r.amount, r.currency)}</td>
                        <td>{r.currency}</td>
                        <td>{r.frequency}</td>
                        <td>{r.start_date}</td>
                        <td>{r.note ?? "—"}</td>
                        <td>
                          <button
                            className="text-cyan-400 hover:underline mr-2"
                            onClick={() => {
                              setEditingId(r.id);
                              setEditDraft(r);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-400 hover:underline mr-2"
                            onClick={() => delRule(r.id)}
                          >
                            Delete
                          </button>
                          {/* Apply button */}
                          <button
                            className="text-green-400 hover:underline"
                            onClick={() => applyRule(r)}
                          >
                            Apply
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
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
                          <input
                            type="number"
                            value={editDraft.amount ?? 0}
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
                            value={editDraft.frequency}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, frequency: e.target.value as any })
                            }
                            className="input"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            value={editDraft.start_date ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, start_date: e.target.value })
                            }
                            className="input"
                          />
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

          <div className="flex justify-between mt-2 text-sm">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn">
              Previous
            </button>
            <button disabled={rules.length < pageSize} onClick={() => setPage(page + 1)} className="btn">
              Next
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <h3 className="font-semibold mb-3">Recurring by Category (SSP)</h3>
          <Doughnut data={donut} />
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
