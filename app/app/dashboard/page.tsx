"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { fmt, currencies } from "@/lib/format";
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

export default function Dashboard() {
  const [showTotals, setShowTotals] = useState(false);

  // ... other state + fetch logic stays the same

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`card cursor-pointer transition ${
              showTotals
                ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40"
                : "hover:bg-white/10"
            }`}
            onClick={() => setShowTotals(!showTotals)}
          >
            <h2 className="font-semibold mb-2">Balances (Lifetime)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(currencies as any).map((cur: string) => (
                <div key={cur} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(0, cur)}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`card cursor-pointer transition ${
              showTotals
                ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/40"
                : "hover:bg-white/10"
            }`}
            onClick={() => setShowTotals(!showTotals)}
          >
            <h2 className="font-semibold mb-2">Balances (This Month)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(currencies as any).map((cur: string) => (
                <div key={cur} className="card p-3">
                  <div className="text-xs text-white/70">{cur}</div>
                  <div className="fit-amount">{fmt(0, cur)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showTotals && (
          <div className="text-sm text-white/80 mt-2">
            {(currencies as any).map((cur: string) => (
              <div key={cur} className="mb-1">
                <strong>{cur}</strong>: Balance {fmt(0, cur)} | Income {fmt(0, cur)} | Expense {fmt(0, cur)}
              </div>
            ))}
          </div>
        )}

        {/* Charts + transactions continue here */}
      </div>
    </RequireAuth>
  );
}
