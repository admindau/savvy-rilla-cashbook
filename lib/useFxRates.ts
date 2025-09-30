"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

/**
 * Last working version:
 * - Hardcoded base rates
 * - $1 = 6000 SSP
 * - 1 KES = 46.5 SSP
 * - Conversion works correctly across charts
 */
export function useFxRates() {
  const [loading, setLoading] = useState(false);

  const convert = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;

    // convert everything into SSP first
    let inSSP = 0;
    if (from === "USD") inSSP = amount * 6000;
    else if (from === "KES") inSSP = amount * 46.5;
    else inSSP = amount; // already SSP

    // convert SSP into target
    if (to === "USD") return inSSP / 6000;
    if (to === "KES") return inSSP / 46.5;
    return inSSP; // SSP
  };

  return { convert, loading };
}
