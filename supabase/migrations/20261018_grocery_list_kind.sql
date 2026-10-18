-- HeyinkMeals — give grocery lists a type so real shopping lists stand apart on the Lists page.
--
--   shopping — restocks and other lists the household edits and reuses (the default for new lists)
--   meal     — the ingredients for one dish or snack
--   single   — a one-item shortcut used from the planner
--
-- Additive + idempotent. The first run pre-fills existing lists from their name and size; after
-- that the household moves lists between types from the Lists page.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'grocery_lists' and column_name = 'kind'
  ) then
    alter table grocery_lists
      add column kind text not null default 'shopping'
      check (kind in ('shopping', 'meal', 'single'));

    update grocery_lists gl
    set kind = case
      when gl.name ~* '(restock|refresh|essentials|lunches|girl''s meals|repeat)' then 'shopping'
      when (select count(*) from grocery_list_items i where i.list_id = gl.id) = 1 then 'single'
      else 'meal'
    end;
  end if;
end $$;
