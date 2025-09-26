# Savvy Rilla Cashbook v3.4.1 — Futuristic Auth Edition

- Email + password auth (signup confirmation, login, password reset)
- Black + subtle gradient accents, pulse glow loader
- Dashboard, Budgets, Recurring wired in
- `supabase/schema.sql` (clean) and `supabase/schema_patch.sql` (migration) included

## Setup
1) Copy `.env.example` → `.env.local`, fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2) Supabase → Auth → Email: enable, confirm email ON; Redirect URLs include `/auth/reset` (local + prod)
3) `npm i` then `npm run dev`

## Deploy
Add env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEFAULT_CURRENCY`
