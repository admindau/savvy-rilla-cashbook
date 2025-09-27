"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { fmt, currencies } from "@/lib/format";
import { Doughnut, Bar } from "react-chartjs-2";
import Toast from "@/components/Toast";
import {
  Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
} from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: "income" | "expense" };
type Tx = { id: string; amount: number; currency: string; kind: string; tx_date: string; account_id: string; category_id: string | null; note: string | null };

export default function Dashboard() {
  // ...existing state...
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  // ...fetch + charts unchanged...

  // CRUD with toasts
  const addTx = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("transactions").insert({
      account_id: String(fd.get("account_id")),
      category_id: (String(fd.get("category_id")) || "") || null,
      amount: Number(fd.get("amount")),
      currency: String(fd.get("currency")),
      kind: String(fd.get("kind")),
      tx_date: String(fd.get("tx_date")),
      note: (String(fd.get("note")) || "") || null,
    });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Transaction created" });
    (e.currentTarget as HTMLFormElement).reset();
    load(page, query);
  };

  const saveEdit = async () => {
    // ...
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Transaction updated" });
  };

  const delTx = async (id: string) => {
    // ...
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑 Transaction deleted" });
  };

  const addAccount = async (fd: FormData) => {
    // ...
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🏦 Account created" });
  };

  const addCategory = async (fd: FormData) => {
    // ...
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "📂 Category created" });
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* ...your balances, charts, search, transactions list, forms... */}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
