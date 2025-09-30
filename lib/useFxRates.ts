"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type FxRate = {
  base: string;
  target: string;
  rate: number;
};

export function useFxRates() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);

  // load rates from Supabase
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("fx").select("*");
    if (!error && data) setRates(data as FxRate[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * Convert an amount from one currency to another
   * If no direct pair is found, it falls back to returning the original amount.
   */
  const convert = (amount: number, from: string, to: string) => {
    if (from === to) return amount;

    const rate = rates.find((r) => r.base === from && r.target === to);
    if (rate) return amount * Number(rate.rate);

    // if inverse exists (to→from), invert the rate
    const inverse = rates.find((r) => r.base === to && r.target === from);
    if (inverse) return amount / Number(inverse.rate);

    // fallback: no conversion found
    return amount;
  };

  return { convert, rates, loading, reload: load };
}
