"use client";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, FormEvent } from "react";
import Toast from "@/components/Toast";

export default function FxPage() {
  const [usdToSsp, setUsdToSsp] = useState(6000);
  const [kesToSsp, setKesToSsp] = useState(46.5);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const loadRates = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data, error } = await supabase.from("fx").select("*").eq("user_id", user_id).single();
    if (!error && data) {
      setUsdToSsp(Number(data.usd_to_ssp));
      setKesToSsp(Number(data.kes_to_ssp));
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { error } = await supabase
      .from("fx")
      .upsert({ user_id, usd_to_ssp: usdToSsp, kes_to_ssp: kesToSsp }, { onConflict: "user_id" });

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ FX rates updated", type: "success" });
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">FX</h1>
        <div className="card">
          <h2 className="font-semibold mb-2">Manage Exchange Rates</h2>
          <form onSubmit={onSave} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/70">1 USD in SSP</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={usdToSsp}
                onChange={(e) => setUsdToSsp(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm text-white/70">1 KES in SSP</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={kesToSsp}
                onChange={(e) => setKesToSsp(Number(e.target.value))}
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn w-full">
                Save Rates
              </button>
            </div>
          </form>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
