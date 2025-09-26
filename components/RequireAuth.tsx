"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
export default function RequireAuth({children}:{children:React.ReactNode}){
  const [ok,setOk]=useState(false); const r=useRouter();
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{if(!data.session) r.replace("/auth"); else setOk(true)});
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>{if(!s) r.replace("/auth");}); return ()=>{sub.subscription.unsubscribe();};},[r]);
  return ok? <>{children}</>: <p>Loading…</p>;
}
