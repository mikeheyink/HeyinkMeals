-- Migration: Add is_archived columns for soft-delete support
-- Run this in your Supabase SQL Editor

-- Add is_archived to grocery_lists
ALTER TABLE grocery_lists
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add is_archived to recipes
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add is_archived to grocery_list_items
ALTER TABLE grocery_list_items
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create indexes for faster filtering on archived status
CREATE INDEX IF NOT EXISTS idx_grocery_lists_archived ON grocery_lists(is_archived);
CREATE INDEX IF NOT EXISTS idx_recipes_archived ON recipes(is_archived);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_archived ON grocery_list_items(is_archived);
