-- Dev feature-capture notes — a lightweight backlog for the developer to jot down
-- changes/ideas on the fly (via the in-app hotkey), review them, and mark them done.
-- Additive + idempotent: safe to run on an existing database.

create table if not exists dev_notes (
  id uuid primary key default uuid_generate_v4(),
  note text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  context text,                       -- route/path the note was captured from, e.g. "/planner"
  created_at timestamptz default now(),
  done_at timestamptz
);

create index if not exists idx_dev_notes_status on dev_notes(status);

-- Row-Level Security — lock to authenticated users, matching every other table.
do $$
begin
  execute 'alter table dev_notes enable row level security';
  if not exists (
    select 1 from pg_policies where tablename = 'dev_notes' and policyname = 'authenticated_all'
  ) then
    execute 'create policy "authenticated_all" on dev_notes for all to authenticated using (true) with check (true)';
  end if;
end $$;
