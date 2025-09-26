
alter table public.accounts          alter column user_id set default auth.uid();
alter table public.categories        alter column user_id set default auth.uid();
alter table public.transactions      alter column user_id set default auth.uid();
alter table public.budgets           alter column user_id set default auth.uid();
alter table public.recurring_rules   alter column user_id set default auth.uid();
NOTIFY pgrst, 'reload schema';
