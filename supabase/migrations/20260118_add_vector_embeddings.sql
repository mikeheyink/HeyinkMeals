-- Migration: Add vector support for semantic search
-- Run this in Supabase SQL Editor

-- 1. Enable the vector extension
create extension if not exists vector;

-- 2. Add embedding columns to recipes
alter table recipes 
add column if not exists embedding vector(768);

-- 3. Add embedding columns to grocery_types
alter table grocery_types 
add column if not exists embedding vector(768);

-- 4. Create index for fast similarity search on recipes
create index if not exists recipes_embedding_idx 
on recipes using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 5. Create index for fast similarity search on grocery_types
create index if not exists grocery_types_embedding_idx 
on grocery_types using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 6. Function to search recipes by embedding similarity
create or replace function match_recipes(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  name text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    recipes.id,
    recipes.name,
    1 - (recipes.embedding <=> query_embedding) as similarity
  from recipes
  where recipes.embedding is not null
    and recipes.is_archived = false
    and 1 - (recipes.embedding <=> query_embedding) > match_threshold
  order by recipes.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 7. Function to search grocery types by embedding similarity
create or replace function match_grocery_types(
  query_embedding vector(768),
  match_threshold float default 0.6,
  match_count int default 3
)
returns table (
  id uuid,
  name text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    grocery_types.id,
    grocery_types.name,
    1 - (grocery_types.embedding <=> query_embedding) as similarity
  from grocery_types
  where grocery_types.embedding is not null
    and 1 - (grocery_types.embedding <=> query_embedding) > match_threshold
  order by grocery_types.embedding <=> query_embedding
  limit match_count;
end;
$$;
