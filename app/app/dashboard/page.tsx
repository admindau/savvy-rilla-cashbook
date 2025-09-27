"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { fmt, currencies } from "@/lib/format";
import { Doughnut, Bar } from "react-chartjs-2";
import Toast from "@/components/Toast";
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

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: "income" | "expense" };
type Tx = {
  id: string;
  amount: number;
  currency: string;
  kind: "income" | "expense" | "transfer";
  tx_date: string;
  account_id: string;
  category_id: string | null;
  note: string | null;
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const limit = 50;

  const [showLifetimeTotals, setShowLifetimeTotals] = useState(false);
  const [showMonthlyTotals, setShowMonthlyTotals] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Tx>>({});

  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  async function fetchIdsAndCount(q: string) {
    let catIds: string[] = [];
    if (q) {
      const c = await supabase.from("categories").select("id").ilike("name", `%${q}%`);
      if (!c.error) catIds = (c.data || []).map((x: any) => x.id);
    }
    let tr = supabase.from("transactions").select("id", { count: "exact", head: true });
    if (q) {
      tr = tr.or(`note.ilike.%${q}%,currency.ilike.%${q}%,kind.ilike.%${q}%`);
      if (catIds.length) tr = tr.in("category_id", catIds);
    }
    const r = await tr;
    setCount(r.count || 0);
    return catIds;
  }

  async function load(p: number, q: string) {
    const from = p * limit;
    const to = from + limit - 1;
    const catIds = await fetchIdsAndCount(q);

    let t = supabase
      .from("transactions")
      .select("id,amount,currency,kind,tx_date,account_id,category_id,note")
      .order("tx_date", { ascending: false })
      .range(from, to);
    if (q) {
      t = t.or(`note.ilike.%${q}%,currency.ilike.%${q}%,kind.ilike.%${q}%`);
      if (catIds.length) t = t.in("category_id", catIds);
    }

    const [a, c, tr] = await Promise.all([
      supabase.from("accounts").select("id,name,currency").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name,kind").order("name"),
      t,
    ]);

    if (!a.error) setAccounts(a.data || []);
    if (!c.error) setCategories(c.data || []);
    if (!tr.error) setTxs(tr.data || []);
  }

  useEffect(() => {
    load(0, "");
  }, []);
  useEffect(() => {
    setPage(0);
    load(0, query);
  }, [query]);

  // ... Lifetime/monthly + charts unchanged ...

  // CRUD handlers with toasts
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
    else setToast({ message: "✅ Transaction created successfully" });
    (e.currentTarget as HTMLFormElement).reset();
    load(page, query);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("transactions").update({
      amount: Number(editDraft.amount),
      currency: String(editDraft.currency),
      kind: String(editDraft.kind),
      tx_date: String(editDraft.tx_date),
      account_id: String(editDraft.account_id),
      category_id: editDraft.category_id ? String(editDraft.category_id) : null,
      note: editDraft.note ?? null,
    }).eq("id", editingId);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✏️ Transaction updated" });
    setEditingId(null);
    setEditDraft({});
    load(page, query);
  };

  const delTx = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🗑 Transaction deleted" });
    load(page, query);
  };

  // Add account
  const addAccount = async (fd: FormData) => {
    const { error } = await supabase.from("accounts").insert({
      name: String(fd.get("name")),
      currency: String(fd.get("currency")),
    });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "🏦 Account created" });
    load(page, query);
  };

  // Add category
  const addCategory = async (fd: FormData) => {
    const { error } = await supabase.from("categories").insert({
      name: String(fd.get("name")),
      kind: String(fd.get("kind")),
    });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "📂 Category created" });
    load(page, query);
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* ...Search, balances, totals, charts, transactions list, forms... */}

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </RequireAuth>
  );
}
