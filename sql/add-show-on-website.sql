-- Run this once in the Supabase SQL editor.
-- Adds a per-product toggle for the retail website. Existing rows stay visible.

alter table products
  add column if not exists show_on_website boolean not null default true;
