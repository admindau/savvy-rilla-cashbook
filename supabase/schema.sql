
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  currency text not null check (currency in ('SSP','USD','KES')),
  balance numeric(18,2) default 0,
  created_at timestamptz default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  kind text not null check (kind in ('income','expense')),
  color text,
  created_at timestamptz default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id),
  amount numeric(18,2) not null,
  kind text not null check (kind in ('income','expense','transfer')),
  currency text not null check (currency in ('SSP','USD','KES')),
  tx_date date not null default current_date,
  note text,
  created_at timestamptz default now()
);
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid references public.categories(id),
  month date not null,
  limit_amount numeric(18,2) not null,
  currency text not null check (currency in ('SSP','USD','KES')),
  created_at timestamptz default now(),
  unique (user_id, category_id, month)
);
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid references public.categories(id),
  account_id uuid references public.accounts(id),
  kind text not null check (kind in ('income','expense')),
  amount numeric(18,2) not null,
  currency text not null check (currency in ('SSP','USD','KES')),
  interval text not null check (interval in ('weekly','monthly','quarterly','yearly')),
  next_run date not null,
  note text,
  created_at timestamptz default now()
);
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table recurring_rules enable row level security;
create policy if not exists "Users own accounts" on accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists "Users own categories" on categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists "Users own transactions" on transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists "Users own budgets" on budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists "Users own recurring_rules" on recurring_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
