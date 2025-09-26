# Savvy Rilla Cashbook v3

- Next.js 14 + Supabase + Tailwind + Chart.js
- RLS-friendly inserts via `user_id default auth.uid()`
- Search on transactions
- Colorful Donut & Bar charts with legends
- Lifetime & Monthly balances (per currency) as cards
- Budgets page with colorful per-category bars + legend
- Header cleanup (no "Open App")

## Supabase
Run `supabase/schema.sql` in SQL Editor. Enable Auth → Email OTP; set URL redirects.

## Env
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_DEFAULT_CURRENCY=SSP
```

## Dev
```
npm i
cp .env.example .env.local
npm run dev
```
