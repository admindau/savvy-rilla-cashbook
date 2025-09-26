
alter table public.transactions drop column if exists type;
alter table public.transactions alter column kind set not null;
alter table public.transactions add column if not exists account_id uuid references public.accounts(id) on delete cascade;
alter table public.transactions add column if not exists category_id uuid references public.categories(id);
NOTIFY pgrst, 'reload schema';
