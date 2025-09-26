# Savvy Rilla Cashbook

Next.js 14 + Supabase + Tailwind cashbook with SSP/USD/KES, budgets, recurring entries, and charts.

## Setup
1. Create a Supabase project → copy Project URL & anon key.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Auth → Providers, enable Email (magic link/OTP).
4. In Auth → URL config, add your Vercel URL and http://localhost:3000.

## Dev
```bash
npm i
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Deploy
- Push to GitHub → Import to Vercel (framework: Next.js)
- Set env vars in Vercel (same as above)
- Deploy

Pages:
- `/auth` Sign-in
- `/app` Dashboard
- `/app/budgets` Budgets
- `/app/recurring` Recurring rules
