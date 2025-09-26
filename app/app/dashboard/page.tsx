
"use client";
import {useEffect,useMemo,useState,FormEvent} from 'react';
import {supabase} from '@/lib/supabaseClient';
import RequireAuth from '@/components/RequireAuth';
import {fmt,currencies} from '@/lib/format';
import {Doughnut,Bar} from 'react-chartjs-2';
import {Chart,ArcElement,Tooltip,Legend,CategoryScale,LinearScale,BarElement} from 'chart.js';
Chart.register(ArcElement,Tooltip,Legend,CategoryScale,LinearScale,BarElement);

type Account={id:string;name:string;currency:string};
type Category={id:string;name:string;kind:'income'|'expense'};
type Tx={id:string;amount:number;currency:string;kind:string;tx_date:string;account_id:string;category_id:string|null;note:string|null};

export default function Dashboard(){
 const[accounts,setAccounts]=useState<Account[]>([]);
 const[categories,setCategories]=useState<Category[]>([]);
 const[txs,setTxs]=useState<Tx[]>([]);
 const[count,setCount]=useState(0);
 const[page,setPage]=useState(0);
 const[query,setQuery]=useState('');
 const limit=50;

 async function fetchIdsAndCount(q:string){
   let catIds:string[]=[];
   if(q){ const c=await supabase.from('categories').select('id').ilike('name', `%${q}%`); if(!c.error) catIds=(c.data||[]).map((x:any)=>x.id); }
   let tr=supabase.from('transactions').select('id',{count:'exact',head:true});
   if(q){ tr=tr.or(`note.ilike.%${q}%,currency.ilike.%${q}%,kind.ilike.%${q}%`); if(catIds.length) tr=tr.in('category_id',catIds); }
   const r=await tr; setCount(r.count||0); return catIds;
 }

 async function load(p:number,q:string){
   const from=p*limit, to=from+limit-1;
   const catIds=await fetchIdsAndCount(q);
   let t=supabase.from('transactions').select('id,amount,currency,kind,tx_date,account_id,category_id,note').order('tx_date',{ascending:false}).range(from,to);
   if(q){ t=t.or(`note.ilike.%${q}%,currency.ilike.%${q}%,kind.ilike.%${q}%`); if(catIds.length) t=t.in('category_id',catIds); }
   const [a,c,tr]=await Promise.all([
     supabase.from('accounts').select('id,name,currency').order('created_at',{ascending:false}),
     supabase.from('categories').select('id,name,kind').order('name'),
     t
   ]);
   if(!a.error) setAccounts(a.data||[]);
   if(!c.error) setCategories(c.data||[]);
   if(!tr.error) setTxs(tr.data||[]);
 }
 useEffect(()=>{ load(0,''); },[]);
 useEffect(()=>{ setPage(0); load(0,query); },[query]);

 const lifetime=useMemo(()=>{const m:Record<string,number>={}; txs.forEach(t=>{const s=(t.kind==='income'?1:-1)*Number(t.amount); m[t.currency]=(m[t.currency]||0)+s;}); return m;},[txs]);
 const monthly=useMemo(()=>{const first=new Date(); first.setDate(1); const m:Record<string,number>={}; txs.forEach(t=>{if(new Date(t.tx_date)>=first){const s=(t.kind==='income'?1:-1)*Number(t.amount); m[t.currency]=(m[t.currency]||0)+s;}}); return m;},[txs]);

 const donut=useMemo(()=>{
   const first=new Date(); first.setDate(1);
   const by:Record<string,number>={};
   txs.forEach(t=>{ if(new Date(t.tx_date)>=first && t.kind==='expense' && t.category_id){ by[t.category_id]=(by[t.category_id]||0)+Number(t.amount); } });
   const items=Object.entries(by);
   return {
     labels: items.map(([id])=>categories.find(c=>c.id===id)?.name||'Uncategorized'),
     datasets:[{ data: items.map(([,v])=>v), backgroundColor:['#22d3ee','#ef4444','#f59e0b','#10b981','#6366f1','#e879f9'] }]
   };
 },[txs,categories]);

 const bar=useMemo(()=>{
   const first=new Date(); first.setDate(1);
   const inc:Record<string,number>={},exp:Record<string,number>={};
   txs.forEach(t=>{ if(new Date(t.tx_date)>=first){ if(t.kind==='income') inc[t.currency]=(inc[t.currency]||0)+Number(t.amount); if(t.kind==='expense') exp[t.currency]=(exp[t.currency]||0)+Number(t.amount); } });
   const labels=(currencies as unknown as string[]);
   return { labels, datasets:[{label:'Income',data:labels.map(k=>inc[k]||0),backgroundColor:'#22d3ee'},{label:'Expense',data:labels.map(k=>exp[k]||0),backgroundColor:'#ef4444'}]};
 },[txs]);

 const totalPages=Math.max(1,Math.ceil(count/limit));
 const prev=()=>{const p=Math.max(0,page-1); setPage(p); load(p,query);};
 const next=()=>{const p=Math.min(totalPages-1,page+1); setPage(p); load(p,query);};

 const addAccount=async(e:FormEvent)=>{e.preventDefault();const fd=new FormData(e.target as HTMLFormElement);await supabase.from('accounts').insert({name:String(fd.get('name')),currency:String(fd.get('currency'))});(e.target as HTMLFormElement).reset();load(page,query);};
 const addCategory=async(e:FormEvent)=>{e.preventDefault();const fd=new FormData(e.target as HTMLFormElement);await supabase.from('categories').insert({name:String(fd.get('name')),kind:String(fd.get('kind'))});(e.target as HTMLFormElement).reset();load(page,query);};
 const addTx=async(e:FormEvent)=>{e.preventDefault();const fd=new FormData(e.target as HTMLFormElement);await supabase.from('transactions').insert({account_id:String(fd.get('account_id')),category_id:String(fd.get('category_id'))||null,amount:Number(fd.get('amount')),currency:String(fd.get('currency')),kind:String(fd.get('kind')),tx_date:String(fd.get('tx_date')),note:String(fd.get('note')||'')||null});(e.target as HTMLFormElement).reset();load(page,query);};

 return (<RequireAuth>
  <div className='grid gap-6'>
    <div className='grid md:grid-cols-2 gap-4'>
      <div className='card'><h2 className='font-semibold mb-2'>Balances (Lifetime)</h2><div className='grid grid-cols-3 gap-2'>{(currencies as any).map((cur:string)=>(<div key={cur} className='card p-3'><div className='text-xs text-white/70'>{cur}</div><div className='fit-amount'>{fmt(lifetime[cur]||0,cur)}</div></div>))}</div></div>
      <div className='card'><h2 className='font-semibold mb-2'>Balances (This month)</h2><div className='grid grid-cols-3 gap-2'>{(currencies as any).map((cur:string)=>(<div key={cur} className='card p-3'><div className='text-xs text-white/70'>{cur}</div><div className='fit-amount'>{fmt(monthly[cur]||0,cur)}</div></div>))}</div></div>
    </div>

    <div className='grid md:grid-cols-2 gap-4'>
      <div className='card'><h3 className='font-semibold mb-3'>Expenses by Category (Donut)</h3><Doughnut data={donut}/></div>
      <div className='card'><h3 className='font-semibold mb-3'>Income vs Expense (per currency)</h3><Bar data={bar}/></div>
    </div>

    <div className='card'>
      <div className='flex items-center justify-between gap-3 mb-3'><h3 className='font-semibold'>Recent Transactions</h3><input className='input max-w-xs' placeholder='🔍 Search transactions...' value={query} onChange={e=>setQuery(e.target.value)} /></div>
      <div>
        <div className='table-row text-white/70'><div>Date</div><div>Kind</div><div>Amount</div><div>Currency</div><div>Category</div><div>Note</div></div>
        {txs.map(t=>{const cat=categories.find(c=>c.id===t.category_id)?.name||'—';return(<div key={t.id} className='table-row'><div>{t.tx_date}</div><div>{t.kind}</div><div>{Number(t.amount).toFixed(2)}</div><div>{t.currency}</div><div>{cat}</div><div className='truncate'>{t.note||''}</div></div>);})}
        {txs.length===0&&<div className='text-white/70'>No transactions found.</div>}
      </div>
      <div className='mt-3 flex items-center justify-between'>
        <div className='text-white/60 text-sm'>Page {page+1} / {totalPages} • {count} results</div>
        <div className='flex gap-2'><button className='btn' onClick={prev} disabled={page===0}>Previous</button><button className='btn' onClick={next} disabled={page>=totalPages-1}>Next</button></div>
      </div>
    </div>

    <div className='grid md:grid-cols-3 gap-4'>
      <div className='card'><h3 className='font-semibold mb-2'>New Account</h3><form onSubmit={addAccount} className='grid gap-2'><input name='name' className='input' placeholder='Account name' required/><select name='currency' className='input'><option>SSP</option><option>USD</option><option>KES</option></select><button className='btn'>Save</button></form></div>
      <div className='card'><h3 className='font-semibold mb-2'>New Category</h3><form onSubmit={addCategory} className='grid gap-2'><input name='name' className='input' placeholder='Category name' required/><select name='kind' className='input'><option>expense</option><option>income</option></select><button className='btn'>Save</button></form></div>
      <div className='card'><h3 className='font-semibold mb-2'>New Transaction</h3><form onSubmit={addTx} className='grid gap-2'><select name='account_id' className='input' required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} • {a.currency}</option>)}</select><select name='category_id' className='input'><option value=''>Uncategorized</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className='grid grid-cols-2 gap-2'><input name='amount' className='input' type='number' step='0.01' placeholder='Amount' required/><select name='currency' className='input'><option>SSP</option><option>USD</option><option>KES</option></select></div><div className='grid grid-cols-2 gap-2'><select name='kind' className='input'><option>expense</option><option>income</option></select><input name='tx_date' className='input' type='date' defaultValue={new Date().toISOString().slice(0,10)}/></div><input name='note' className='input' placeholder='Note (optional)'/><button className='btn'>Add</button></form></div>
    </div>
  </div>
 </RequireAuth>);
}
