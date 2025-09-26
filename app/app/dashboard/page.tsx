"use client";
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RequireAuth from '@/components/RequireAuth';
import { fmt, currencies } from '@/lib/format';
import { colorForId } from '@/lib/palette';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Account={id:string; name:string; currency:string;};
type Category={id:string; name:string; kind:'income'|'expense'};
type Tx={id:string; amount:number; currency:string; kind:string; tx_date:string; account_id:string; category_id:string|null; note:string|null};

export default function Dashboard(){
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [txs,setTxs]=useState<Tx[]>([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState<string|null>(null);

  const fetchAll=async()=>{
    setLoading(true);
    const a=await supabase.from('accounts').select('id,name,currency').order('created_at',{ascending:false});
    const c=await supabase.from('categories').select('id,name,kind').order('name');
    const t=await supabase.from('transactions').select('id,amount,currency,kind,tx_date,account_id,category_id,note').order('tx_date',{ascending:false}).limit(50);
    if(!a.error) setAccounts(a.data||[]);
    if(!c.error) setCategories(c.data||[]);
    if(!t.error) setTxs(t.data||[]);
    setLoading(false);
  };
  useEffect(()=>{ fetchAll(); },[]);

  const lifetime = useMemo(()=>{
    const map: Record<string, number> = {};
    txs.forEach(t=>{
      const s = (t.kind==='income'?1:-1)*Number(t.amount);
      map[t.currency] = (map[t.currency]||0) + s;
    });
    return map;
  },[txs]);

  const monthly = useMemo(()=>{
    const start = new Date(); start.setDate(1);
    const map: Record<string, number> = {};
    txs.forEach(t=>{
      if(new Date(t.tx_date)>=start){
        const s = (t.kind==='income'?1:-1)*Number(t.amount);
        map[t.currency] = (map[t.currency]||0) + s;
      }
    });
    return map;
  },[txs]);

  const donut = useMemo(()=>{
    const start = new Date(); start.setDate(1);
    const byCat: Record<string, number> = {};
    txs.forEach(t=>{
      if(new Date(t.tx_date)>=start && t.kind==='expense' && t.category_id){
        byCat[t.category_id] = (byCat[t.category_id]||0) + Number(t.amount);
      }
    });
    const items = Object.entries(byCat);
    const labels = items.map(([id])=> categories.find(c=>c.id===id)?.name || 'Uncategorized');
    const data = items.map(([id,v])=> v);
    const bg = items.map(([id])=> colorForId(id));
    return { labels, datasets:[{ data, backgroundColor:bg }] };
  },[txs,categories]);

  const bar = useMemo(()=>{
    const start = new Date(); start.setDate(1);
    const inc: Record<string, number> = {}; const exp: Record<string, number> = {};
    txs.forEach(t=>{
      if(new Date(t.tx_date)>=start){
        if(t.kind==='income') inc[t.currency]=(inc[t.currency]||0)+Number(t.amount);
        if(t.kind==='expense') exp[t.currency]=(exp[t.currency]||0)+Number(t.amount);
      }
    });
    const labels = (currencies as unknown as string[]);
    return { labels, datasets: [{ label:'Income', data: labels.map(k=>inc[k]||0) }, { label:'Expense', data: labels.map(k=>exp[k]||0) }] };
  },[txs]);

  const addAccount=async(e:FormEvent)=>{
    e.preventDefault(); setMsg(null);
    const fd=new FormData(e.target as HTMLFormElement);
    const name=String(fd.get('name')); const currency=String(fd.get('currency'));
    const { error } = await supabase.from('accounts').insert({ name, currency });
    if(error) setMsg(error.message); else { (e.target as HTMLFormElement).reset(); fetchAll(); }
  };
  const addCategory=async(e:FormEvent)=>{
    e.preventDefault(); setMsg(null);
    const fd=new FormData(e.target as HTMLFormElement);
    const name=String(fd.get('name')); const kind=String(fd.get('kind'));
    const { error } = await supabase.from('categories').insert({ name, kind });
    if(error) setMsg(error.message); else { (e.target as HTMLFormElement).reset(); fetchAll(); }
  };
  const addTx=async(e:FormEvent)=>{
    e.preventDefault(); setMsg(null);
    const fd=new FormData(e.target as HTMLFormElement);
    const payload:any = {
      account_id: String(fd.get('account_id')),
      category_id: String(fd.get('category_id')) || null,
      amount: Number(fd.get('amount')),
      currency: String(fd.get('currency')),
      kind: String(fd.get('kind')),
      tx_date: String(fd.get('tx_date')),
      note: String(fd.get('note')||'') || null,
    };
    const { error } = await supabase.from('transactions').insert(payload);
    if(error) setMsg(error.message); else { (e.target as HTMLFormElement).reset(); fetchAll(); }
  };

  return (<RequireAuth>
    <div className='grid gap-6'>
      <div className='grid md:grid-cols-2 gap-4'>
        <div className='card'>
          <h2 className='font-semibold mb-2'>Balances (Lifetime)</h2>
          <div className='grid grid-cols-3 gap-2'>{(currencies as unknown as string[]).map(cur=>(
            <div key={cur} className='card p-3'>
              <div className='text-xs text-white/70'>{cur}</div>
              <div className='text-lg'>{fmt(lifetime[cur]||0, cur)}</div>
            </div>
          ))}</div>
        </div>
        <div className='card'>
          <h2 className='font-semibold mb-2'>Balances (This month)</h2>
          <div className='grid grid-cols-3 gap-2'>{(currencies as unknown as string[]).map(cur=>(
            <div key={cur} className='card p-3'>
              <div className='text-xs text-white/70'>{cur}</div>
              <div className='text-lg'>{fmt(monthly[cur]||0, cur)}</div>
            </div>
          ))}</div>
        </div>
      </div>

      <div className='grid md:grid-cols-2 gap-4'>
        <div className='card'>
          <h3 className='font-semibold mb-3'>Expenses by Category (Donut)</h3>
          {donut.datasets[0]?.data?.length? <Doughnut data={donut} /> : <div className='text-white/70'>No expense data yet.</div>}
          {donut.labels?.length>0 && <div className='mt-3 grid grid-cols-2 gap-2 text-sm'>{donut.labels.map((l,i)=>(<div key={i}><span className='legend-dot' style={{backgroundColor: (donut.datasets[0] as any).backgroundColor[i]}}></span>{l}</div>))}</div>}
        </div>
        <div className='card'>
          <h3 className='font-semibold mb-3'>Income vs Expense (per currency)</h3>
          <Bar data={bar} />
          <div className='mt-3 text-sm text-white/80'>Legend: Income, Expense</div>
        </div>
      </div>

      <div className='grid md:grid-cols-3 gap-4'>
        <div className='card'>
          <h3 className='font-semibold mb-2'>New Account</h3>
          <form onSubmit={addAccount} className='space-y-2'>
            <input name='name' className='input' placeholder='Account name' required/>
            <select name='currency' className='input'>{(currencies as any).map((c:string)=><option key={c}>{c}</option>)}</select>
            <button className='btn w-full'>Save</button>
          </form>
        </div>
        <div className='card'>
          <h3 className='font-semibold mb-2'>New Category</h3>
          <form onSubmit={addCategory} className='space-y-2'>
            <input name='name' className='input' placeholder='Category name' required/>
            <select name='kind' className='input'><option>expense</option><option>income</option></select>
            <button className='btn w-full'>Save</button>
          </form>
        </div>
        <div className='card'>
          <h3 className='font-semibold mb-2'>New Transaction</h3>
          <form onSubmit={addTx} className='space-y-2'>
            <select name='account_id' className='input' required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} • {a.currency}</option>)}</select>
            <select name='category_id' className='input'><option value=''>Uncategorized</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <div className='grid grid-cols-2 gap-2'>
              <input name='amount' className='input' type='number' step='0.01' placeholder='Amount' required/>
              <select name='currency' className='input'>{(currencies as any).map((c:string)=><option key={c}>{c}</option>)}</select>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <select name='kind' className='input'><option>expense</option><option>income</option></select>
              <input name='tx_date' className='input' type='date' defaultValue={new Date().toISOString().slice(0,10)}/>
            </div>
            <input name='note' className='input' placeholder='Note (optional)'/>
            <button className='btn w-full'>Add</button>
          </form>
        </div>
      </div>

      <div className='card'>
        <h3 className='font-semibold mb-2'>Recent Transactions</h3>
        <div className='table'>
          <div className='grid grid-cols-6 text-white/70 border-b border-white/10 pb-1 mb-1'>
            <div>Date</div><div>Kind</div><div>Amount</div><div>Currency</div><div>Category</div><div>Note</div>
          </div>
          {txs.map(t=>{
            const cat = categories.find(c=>c.id===t.category_id)?.name || '—';
            return (<div key={t.id} className='grid grid-cols-6 py-1 border-b border-white/5'>
              <div>{t.tx_date}</div><div>{t.kind}</div><div>{Number(t.amount).toFixed(2)}</div><div>{t.currency}</div><div>{cat}</div><div className='truncate'>{t.note||''}</div>
            </div>);
          })}
          {txs.length===0 && <div className='text-white/70'>No transactions yet.</div>}
        </div>
      </div>
      {msg && <div className='card text-red-300'>{msg}</div>}
    </div>
  </RequireAuth>);
}
