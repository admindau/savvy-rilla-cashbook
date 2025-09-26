-- Drop obsolete 'type' column, ensure 'kind' has correct constraint, add missing FKs, reload cache
alter table public.transactions drop column if exists type;

alter table public.transactions
  alter column kind set not null;

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and conname like '%type_check%'
  loop
    execute format('alter table public.transactions drop constraint %I', c);
  end loop;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and conname = 'transactions_kind_check'
  ) then
    alter table public.transactions
      add constraint transactions_kind_check
      check (kind in ('income','expense','transfer'));
  end if;
end$$;

alter table public.transactions
  add column if not exists account_id uuid references public.accounts(id) on delete cascade;

alter table public.transactions
  add column if not exists category_id uuid references public.categories(id);

NOTIFY pgrst, 'reload schema';
