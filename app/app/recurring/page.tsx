"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, FormEvent } from "react";
import Toast from "@/components/Toast";
import { fmt } from "@/lib/format";

type Category = { id: string; name: string; kind: "income" | "expense" };
type Recurring = {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  frequency: string;
  start_date: string;
  next_run: string | null;
  user_id?: string;
};

export default function RecurringPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [rules, setRules] = useState<Recurring[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Recurring>>({});
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const fetchAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data: cData } = await supabase.from("categories").select("*");
    setCats(cData || []);

    const { data: rData } = await supabase
      .from("recurring")
      .select("*")
      .eq("user_id", user_id);
    setRules(rData || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const addRule = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) {
      setToast({ message: "❌ No logged-in user", type: "error" });
      return;
    }

    const { error } = await supabase.from("recurring").insert([{
      user_id,
      category_id: String(fd.get("category_id")),
      amount: Number(fd.get("amount")),
      currency: String(fd.get("currency")),
      frequency: String(fd.get("frequency")),
      start_date: String(fd.get("start_date")),
    }]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Recurring rule created" });
    fetchAll();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { error } = await supabase.from("recurring").update({
      user_id,
      category_id: String(editDraft.category_id),
      amount: Number(editDraft.amount),
      currency: String(editDraft.currency),
      frequency: String(editDraft.frequency),
      start_date: String(editDraft.start_date),
    }).eq("id", editingId).eq("user_id", user_id);

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
    // Simplified: just show toast
    setToast({ message: "✅ Rule applied (implement TX creation logic later)" });
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
              e.currentTarget.reset();
            }}
            className="grid md:grid-cols-6 gap-2"
          >
            <select name="category_id" className="input">
              {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <input name="amount" type="number" step="0.01" placeholder="Amount" required className="input" />
            <select name="currency" className="input"><option>SSP</option><option>USD</option><option>KES</option></select>
            <select name="frequency" className="input">
              <option>daily</option>
              <option>weekly</option>
              <option>monthly</option>
            </select>
            <input name="start_date" type="date" className="input" required />
            <button className="btn">Save</button>
          </form>
        </div>

        {/* Rules List */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">All Recurring Rules</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Category</th><th>Amount</th><th>Currency</th><th>Frequency</th><th>Start</th><th>Next Run</th><th>Actions</th>
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
                          <button className="underline mr-2" onClick={() => { setEditingId(r.id); setEditDraft(r); }}>Edit</button>
                          <button className="underline text-red-400 mr-2" onClick={() => delRule(r.id)}>Delete</button>
                          <button className="underline text-green-400" onClick={() => applyRule(r.id)}>Apply</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <select value={String(editDraft.category_id)} onChange={(e) => setEditDraft((d) => ({ ...d, category_id: e.target.value }))} className="input">
                            {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                          </select>
                        </td>
                        <td>
                          <input type="number" className="input" value={Number(editDraft.amount)} onChange={(e) => setEditDraft((d) => ({ ...d, amount: Number(e.target.value) }))} />
                        </td>
                        <td>
                          <select value={String(editDraft.currency)} onChange={(e) => setEditDraft((d) => ({ ...d, currency: e.target.value }))} className="input">
                            <option>SSP</option><option>USD</option><option>KES</option>
                          </select>
                        </td>
                        <td>
                          <select value={String(editDraft.frequency)} onChange={(e) => setEditDraft((d) => ({ ...d, frequency: e.target.value }))} className="input">
                            <option>daily</option><option>weekly</option><option>monthly</option>
                          </select>
                        </td>
                        <td>
                          <input type="date" className="input" value={String(editDraft.start_date)} onChange={(e) => setEditDraft((d) => ({ ...d, start_date: e.target.value }))} />
                        </td>
                        <td>{r.next_run ?? "—"}</td>
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

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
