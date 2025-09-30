"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";
import { useEffect, useState, FormEvent } from "react";

type FxRate = {
  id: string;
  base: string;
  target: string;
  rate: number;
  user_id?: string;
};

export default function FxPage() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(
    null
  );

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { data, error } = await supabase
      .from("fx")
      .select("*")
      .eq("user_id", user_id);

    if (error) setToast({ message: error.message, type: "error" });
    setRates(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addRate = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("fx").upsert([
      {
        user_id,
        base: String(fd.get("base")),
        target: String(fd.get("target")),
        rate: Number(fd.get("rate")),
      },
    ]);

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Rate saved", type: "success" });
    load();
  };

  const delRate = async (id: string) => {
    if (!confirm("Delete this FX rate?")) return;
    const { error } = await supabase.from("fx").delete().eq("id", id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Rate deleted", type: "success" });
    load();
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">FX Rates</h1>

        {/* Add Rate */}
        <div className="card">
          <h2 className="font-semibold mb-2">Add / Update Rate</h2>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              addRate(new FormData(e.currentTarget));
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="grid md:grid-cols-4 gap-2"
          >
            <select name="base" className="input">
              <option>USD</option>
              <option>SSP</option>
              <option>KES</option>
            </select>
            <select name="target" className="input">
              <option>USD</option>
              <option>SSP</option>
              <option>KES</option>
            </select>
            <input
              name="rate"
              type="number"
              step="0.01"
              placeholder="Rate"
              required
              className="input"
            />
            <button className="btn">Save</button>
          </form>
        </div>

        {/* Rates list */}
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-2">Current Rates</h3>
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr>
                <th>Base</th>
                <th>Target</th>
                <th>Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td>{r.base}</td>
                  <td>{r.target}</td>
                  <td>{r.rate}</td>
                  <td>
                    <button
                      className="text-red-400 hover:underline"
                      onClick={() => delRate(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
