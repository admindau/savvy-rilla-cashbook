// ...imports same as before...

const rates = { USD: 6000, SSP: 1, KES: 46.5 };

export default function RecurringPage() {
  // ...existing state...
  const [chartCurrency,setChartCurrency]=useState<"USD"|"SSP"|"KES">("SSP");

  const convert=(amount:number,from:string,to:string)=>{
    const ssp=from==="USD"?amount*6000:from==="KES"?amount*46.5:amount;
    if(to==="SSP") return ssp;
    if(to==="USD") return ssp/6000;
    if(to==="KES") return ssp/46.5;
    return ssp;
  };

  // ...existing fetchAll, add, edit, delete...

  // Chart: total recurring by category
  const donut = {
    labels: rules.map((r)=>cats.find((c)=>c.id===r.category_id)?.name??"—"),
    datasets:[{data:rules.map((r)=>convert(r.amount,r.currency,chartCurrency)),backgroundColor:rules.map((r)=>"#"+Math.floor(Math.random()*16777215).toString(16))}]
  };

  return (
    <RequireAuth>
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Recurring Rules</h1>

        {/* ...Add form and list unchanged... */}

        {/* Chart + toggle */}
        <div className="flex justify-end gap-2">
          {(["SSP","USD","KES"] as const).map((c)=>(
            <button key={c} className={`btn ${chartCurrency===c?"bg-cyan-600":""}`} onClick={()=>setChartCurrency(c)}>{c}</button>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Recurring Totals ({chartCurrency})</h3>
          <Doughnut data={donut}/>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
      </div>
    </RequireAuth>
  );
}
