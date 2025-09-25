# Savvy Rilla Cashbook

A modern, privacy-first cashbook to track income & expenses with multi-currency support (SSP, USD, KES). Built with **Next.js 14 (App Router)**, **Supabase** (Auth + DB), **Tailwind CSS**, and **react-chartjs-2** for charts.

## Features
- Email OTP sign-in with Supabase (no passwords).
- Accounts, Categories (income/expense), Transactions.
- Monthly budgets and progress bars.
- Recurring rules (manual "Apply Now" to create transactions).
- Multi-currency (SSP, USD, KES) per account/transaction.
- Clean dark UI with responsive charts and tables.
- Ready for Vercel. Minimal environment config.

## 1) One-time setup
1. **Create a Supabase project** → get `Project URL` and `anon key`.
2. In Supabase **SQL Editor**, run: `supabase/schema.sql` (copy-paste).
3. In **Authentication → Providers**, enable **Email** (magic link/OTP).
4. In **Auth → URL config**, add your Vercel domain & `http://localhost:3000`.

## 2) Local dev
```bash
npm i
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## 3) Deploy to Vercel
- Push this repository to GitHub.
- Import into Vercel → framework: **Next.js**.
- Set env vars in Vercel project:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_DEFAULT_CURRENCY` (optional; default `SSP`)
- Build & deploy. Done.

## Tips
- Create at least **one Account** and **a couple Categories** first.
- For Budgets, set a monthly limit per category.
- Recurring rules show a button to create this period’s transaction; you can later automate via Supabase cron if desired.
