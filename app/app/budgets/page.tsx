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

type Category = { id: string; name: string; kind: "income" | "expense" };
type Budget = { id: string; category_id: string; month: string; limit_amount: number; currency: string; user_id?: string };
type Tx = { category_id: string | null; amount: number; kind: string; tx_date: string; currency: string };

const color = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const colors = ["#22d3ee","#a78bfa","#fb7185","#34d399","#f59e0b","#f472b6","#84cc16","#e879f9","#f97316"];
  return colors[h % colors.length];
};

export default function BudgetsPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Budget>>({});
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" } | null>(null);

  const fetchAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data: cData } = await supabase.from("categories").select("*").eq("kind", "expense");
    const { data: bData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user_id) // ✅ per-user filter
      .gte("month", month + "-01")
      .lte("month", month + "-31");

    setCats(cData || []);
    setBudgets(bData || []);

    // month expense aggregation
    const start = month + "-01";
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const { data: tData } = await supabase
      .from("transactions")
      .select("category_id,amount,kind,tx_date,currency,user_id")
      .eq("user_id", user_id) // ✅ per-user filter
      .gte("tx_date", start)
      .lte("tx_date", end);

    const m: Record<string, number> = {};
    (tData || []).forEach((x: Tx) => {
      if (x.kind === "expense" && x.category_id) {
        m[x.category_id] = (m[x.category_id] || 0) + Number(x.amount);
      }
    });
    setProgress(m);

    // Over-limit toasts
    (bData || []).forEach((b) => {
      const spent = m[b.category_id] || 0;
      if (spent > Number(b.limit_amount)) {
        const catName = (cData || []).find((c) => c.id === b.category_id)?.name ?? "Unknown";
        setToast({ message: `⚠️ You’ve exceeded your budget for ${catName}`, type: "warning" });
      }
    });
  };

  useEffect(() => { fetchAll(); }, [month]);

  const addBudget = async (fd: FormData) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("budgets").insert({
      user_id, // ✅ attach user_id
      category_id: String(fd.get("category_id")),
      limit_amount: Number(fd.get("limit_amount")),
      currency: String(fd.get("currency")),
      month: month + "-01",
    });

    if (error) {
      if (error.message.includes("duplicate key value")) {
        setToast({ message: "⚠️ A budget for this category and month already exists.", type: "warning" });
      } else {
        setToast({ message: error.message, type: "error" });
      }
    } else {
      setToast({ message: "✅ Budget created" });
      fetchAll();
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from("budgets").update({
      user_id,
      category_id: String(editDraft.category_id),
      limit_amount: Number(editDraft.limit_amount),
      currency: String(editDraft.currency),
    }).eq("id", editingId).eq("user_id", user_id); // ✅ per-user update

    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Budget updated" });

    setEditingId(null);
    setEditDraft({});
    fetchAll();
  };

  const delBudget = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    if (!confirm("Delete this budget?")) return;
    const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user_id); // ✅ per-user delete
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑️ Budget deleted" });
    fetchAll();
  };

  // Charts + search (unchanged from last version) ...

  // return (...) unchanged, still showing Add Budget, Search, All Budgets list, progress bars, charts, toasts
}
