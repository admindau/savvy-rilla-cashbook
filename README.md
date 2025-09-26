# Savvy Rilla Cashbook v3.3 — Futuristic Edition (Immaculate)
- Full dashboard (search, colorful charts w/ legends, balances cards, forms)
- Header: user email (pill) + logout icon
- Explicit `user_id` inserts via `insertWithUser` (console logging)
- Budgets: colorful bars + legend
- Recurring: add/apply rules; uses `insertWithUser`
- Animated gradient background + glassmorphism + neon accents
- Pulse glow loader replaces all 'Loading…' placeholders
- RLS schema in `supabase/schema.sql`

## Setup
1) Copy `.env.example` → `.env.local` and fill Supabase vars.
2) Run SQL in `supabase/schema.sql` (tables + RLS + view).
3) Install & run:
```
npm i
npm run dev
```

If you see RLS issues, open DevTools and confirm you see:
`InsertWithUser: <table> for user <uuid>` before inserts.
