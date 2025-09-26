-- drop type, ensure kind, ensure FKs, reload
alter table public.transactions drop column if exists type;
alter table public.transactions alter column kind set not null;
NOTIFY pgrst, 'reload schema';
