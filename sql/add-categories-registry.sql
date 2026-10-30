create table if not exists public.categories (
  name text primary key,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_name_case_insensitive
  on public.categories (lower(name));

alter table public.categories enable row level security;
grant select, insert, delete on public.categories to anon, authenticated;

drop policy if exists categories_select_public on public.categories;
create policy categories_select_public
  on public.categories for select to public using (true);

drop policy if exists categories_insert_public on public.categories;
create policy categories_insert_public
  on public.categories for insert to public with check (true);

drop policy if exists categories_delete_public on public.categories;
create policy categories_delete_public
  on public.categories for delete to public using (true);

do $$
declare
  product_row record;
  parsed_category jsonb;
  category_name text;
begin
  for product_row in
    select category from public.products where category is not null
  loop
    parsed_category := null;
    begin
      parsed_category := product_row.category::jsonb;
    exception when others then
      parsed_category := null;
    end;

    if jsonb_typeof(parsed_category) = 'array' then
      for category_name in
        select jsonb_array_elements_text(parsed_category)
      loop
        insert into public.categories (name)
        select btrim(category_name)
        where btrim(category_name) <> ''
        on conflict do nothing;
      end loop;
    elsif jsonb_typeof(parsed_category) = 'string' then
      category_name := parsed_category #>> '{}';
      insert into public.categories (name)
      select btrim(category_name)
      where btrim(category_name) <> ''
      on conflict do nothing;
    else
      foreach category_name in array string_to_array(product_row.category, ',')
      loop
        insert into public.categories (name)
        select btrim(category_name)
        where btrim(category_name) <> ''
        on conflict do nothing;
      end loop;
    end if;
  end loop;
end;
$$;
