// ...imports same as before...

const rates = { USD: 6000, SSP: 1, KES: 46.5 };

export default function BudgetsPage() {
  // ...existing state...
  const [chartCurrency, setChartCurrency] = useState<"USD"|"SSP"|"KES">("SSP");

  const convert = (amount:number, from:string, to:string) => {
    const ssp = from==="USD"?amount*6000:from==="KES"?amount*46.5:amount;
    if(to==="SSP") return ssp;
    if(to==="USD") return ssp/6000;
    if(to==="KES") return ssp/46.5;
    return ssp;
  };

  // ...fetchAll unchanged...

  // Charts with conversion
  const donut = {
    labels: filtered.map((b)=>cats.find((c)=>c.id===b.category_id)?.name??"—"),
    datasets:[{data:filtered.map((b)=>convert(Number(b.limit_amount),b.currency,chartCurrency)),backgroundColor:filtered.map((b)=>color(b.category_id))}]
  };
  const bar = {
    labels: filtered.map((b)=>cats.find((c)=>c.id===b.category_id)?.name??"—"),
    datasets:[
      {label:"Spent",data:filtered.map((b)=>convert(progress[b.category_id]||0,b.currency,chartCurrency)),backgroundColor:"#ef4444"},
      {label:"Budget",data:filtered.map((b)=>convert(Number(b.limit_amount),b.currency,chartCurrency)),backgroundColor:"#22c55e"}
    ]
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        {/* ...existing add/search/list/progress bars... */}

        {/* Charts with toggle */}
        <div className="flex justify-end gap-2">
          {(["SSP","USD","KES"] as const).map((c)=>(
            <button key={c} className={`btn ${chartCurrency===c?"bg-cyan-600":""}`} onClick={()=>setChartCurrency(c)}>{c}</button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card"><h3 className="font-semibold mb-3">Budget Breakdown ({chartCurrency})</h3><Doughnut data={donut}/></div>
          <div className="card"><h3 className="font-semibold mb-3">Spent vs Budget ({chartCurrency})</h3><Bar data={bar}/></div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
      </div>
    </RequireAuth>
  );
}
