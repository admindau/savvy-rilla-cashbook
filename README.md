# Savvy Rilla Cashbook v3.4.2 — Futuristic Patch

- Email/password auth (signup, login, reset)
- Dashboard with server-side search (partial), pagination (50/page), charts, balances fit
- Budgets with colorful progress bars + legend
- Recurring rules (add/apply)
- Black theme with gradient accents + pulse glow loader

## Setup
1) Copy `.env.example` → `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2) Apply `supabase/schema.sql`, then `supabase/schema_patch_v3.4.2.sql` in Supabase SQL editor.
3) `npm i` then `npm run dev`.
