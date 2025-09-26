"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Page() {
  return (
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <div className="card">
        <h1 className="text-3xl font-semibold mb-2">Savvy Rilla Cashbook</h1>
        <p className="text-white/70 mb-6">
          Track income & expenses in SSP, USD, and KES. Set budgets and see trends.
        </p>
        <Link href="/app" className="btn">Launch App <ArrowRight size={18}/></Link>
      </div>
      <div className="card">
        <h2 className="text-xl mb-2">Highlights</h2>
        <ul className="list-disc ml-6 space-y-2 text-white/80">
          <li>Email OTP sign-in</li>
          <li>Accounts, Categories, Transactions</li>
          <li>Budgets & recurring entries</li>
          <li>Charts & clean dark UI</li>
        </ul>
      </div>
    </div>
  );
}
