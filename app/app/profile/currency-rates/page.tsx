"use client";

import RequireAuth from "@/components/RequireAuth";
import { useState, FormEvent } from "react";

export default function CurrencyRatesPage() {
  const [usdToSsp, setUsdToSsp] = useState(6000);
  const [kesToSsp, setKesToSsp] = useState(46.5);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    alert("💡 Rate update feature coming soon!");
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Currency Rates</h1>
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
      </div>
    </RequireAuth>
  );
}
