"use client";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, FormEvent } from "react";
import { fmt } from "@/lib/format";
import Toast from "@/components/Toast";
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

type Tx = { id: string; amount: number; kind: string; currency: string; category_id: string | null; tx_date: string; user_id?: string };
type Category = { id: string; name: string };

const rates = { USD: 6000, SSP: 1, KES: 46.5 };

export default function DashboardPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [chartCurrency, setChartCurrency] = useState<"USD" | "SSP" | "KES">("SSP");

  const pageSize = 50;

  const convert = (amount: number, from: string, to: string) => {
    const ssp = from === "USD" ? amount * 6000 : from === "KES" ? amount * 46.5 : amount;
    if (to === "SSP") return ssp;
    if (to === "USD") return ssp / 6000;
    if (to === "KES") return ssp / 46.5;
    return ssp;
  };

  const fetchAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data: cData } = await supabase.from("categories").select("*");
    setCats(cData || []);

    let q = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user_id)
      .order("tx_date", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (query) {
      const matchCats = (cData || []).filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      );
      const catIds = matchCats.map((c) => c.id);
      if (catIds.length > 0) {
        q = q.in("category_id", catIds);
      } else {
        setTxs([]);
        return;
      }
    }

    const { data: tData } = await q;
    setTxs(tData || []);
  };

  useEffect(() => { fetchAll(); }, [page, query]);

  // Charts
  const byCategory: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.kind === "expense" && t.category_id) {
      byCategory[t.category_id] = (byCategory[t.category_id] || 0) + convert(t.amount, t.currency, chartCurrency);
    }
  });
  const donut = {
    labels: Object.keys(byCategory).map((id) => cats.find((c) => c.id === id)?.name ?? "—"),
    datasets: [{ data: Object.values(byCategory), backgroundColor: ["#22d3ee","#a78bfa","#fb7185","#34d399","#f59e0b","#f472b6","#84cc16","#e879f9","#f97316"] }],
  };

  const byCurrency: Record<string, { income: number; expense: number }> = {};
  txs.forEach((t) => {
    if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expense: 0 };
    byCurrency[t.currency][t.kind === "income" ? "income" : "expense"] += t.amount;
  });
  const bar = {
    labels: Object.keys(byCurrency),
    datasets: [
      {
        label: "Income",
        data: Object.entries(byCurrency).map(([cur, vals]) => convert(vals.income, cur, chartCurrency)),
        backgroundColor: "#22c55e",
      },
      {
        label: "Expense",
        data: Object.entries(byCurrency).map(([cur, vals]) => convert(vals.expense, cur, chartCurrency)),
        backgroundColor: "#ef4444",
      },
    ],
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* Search */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <input className="input max-w-md" placeholder="🔍 Search transactions..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {/* Charts with toggle */}
        <div className="flex justify-end gap-2">
          {(["SSP","USD","KES"] as const).map((c) => (
            <button key={c} className={`btn ${chartCurrency===c?"bg-cyan-600":""}`} onClick={()=>setChartCurrency(c)}>{c}</button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card"><h3 className="font-semibold mb-3">Expenses by Category ({chartCurrency})</h3><Doughnut data={donut} /></div>
          <div className="card"><h3 className="font-semibold mb-3">Income vs Expense ({chartCurrency})</h3><Bar data={bar} /></div>
        </div>

        {/* Transactions table ... (unchanged) */}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
