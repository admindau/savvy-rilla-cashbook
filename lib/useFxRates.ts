"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useFxRates() {
  const [usdToSsp, setUsdToSsp] = useState(6000);
  const [kesToSsp, setKesToSsp] = useState(46.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRates = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData?.user?.id;
      if (!user_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("fx")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (!error && data) {
        setUsdToSsp(Number(data.usd_to_ssp));
        setKesToSsp(Number(data.kes_to_ssp));
      }
      setLoading(false);
    };

    loadRates();
  }, []);

  const convert = (amount: number, from: string, to: "USD" | "SSP" | "KES") => {
    const ssp =
      from === "USD"
        ? amount * usdToSsp
        : from === "KES"
        ? amount * kesToSsp
        : amount;
    if (to === "SSP") return ssp;
    if (to === "USD") return ssp / usdToSsp;
    if (to === "KES") return ssp / kesToSsp;
    return ssp;
  };

  return { usdToSsp, kesToSsp, loading, convert };
}
