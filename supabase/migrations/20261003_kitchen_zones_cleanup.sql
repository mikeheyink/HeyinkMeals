-- HeyinkMeals — kitchen zones + ingredient de-duplication + unit standardisation (DATA migration).
--
-- Why: the Shop list is walked through the house ("what do we already have?") before shopping,
-- so grocery categories are *storage zones in the kitchen*, listed in walking order. This:
--   1. reshapes grocery_categories into zones (fridge / freezer / counter / pantry sub-zones …)
--   2. merges duplicate grocery types (repointing every FK) and refiles misfiled items
--   3. normalises unit spellings to the canonical SA-metric set (see src/lib/units.ts)
--   4. turns "recipes" that are really bought ready-meals into Items, and Leftovers into a Note
--
-- Idempotent-ish: merges/renames are no-ops once applied. A full pre-migration snapshot lives
-- in the `backup_20261003` schema (drop it once you're happy).

-- ---------------------------------------------------------------------------------------------
-- Helpers (session-scoped)
-- ---------------------------------------------------------------------------------------------

-- Merge every grocery type named `src` into the (most-used) one named `dst`.
create or replace function pg_temp.merge_gt(src text, dst text) returns void language plpgsql as $$
declare d uuid; s uuid;
begin
  select g.id into d from grocery_types g where g.name = dst
    order by (select count(*) from recipe_ingredients ri where ri.grocery_type_id = g.id) desc, g.id limit 1;
  if d is null then raise notice 'merge target % not found', dst; return; end if;
  for s in select id from grocery_types where name = src and id <> d loop
    update recipe_ingredients  set grocery_type_id = d where grocery_type_id = s;
    update shopping_list_items set grocery_type_id = d where grocery_type_id = s;
    update grocery_list_items  set grocery_type_id = d where grocery_type_id = s;
    update meal_plan_entries   set item_grocery_type_id = d where item_grocery_type_id = s;
    delete from grocery_types where id = s;
  end loop;
end $$;

create or replace function pg_temp.zone(zone_name text, items text[]) returns void language sql as $$
  update grocery_types set category_id = (select id from grocery_categories where name = zone_name)
  where name = any(items);
$$;

create or replace function pg_temp.unit(u text) returns text language sql immutable as $$
  select case lower(trim(coalesce(u, '')))
    when '' then 'item' when 'items' then 'item' when 'pcs' then 'item' when 'pc' then 'item'
    when 'head' then 'item' when 'cube' then 'item' when 'whole' then 'item'
    when 'tbps' then 'tbsp' when 'tablespoon' then 'tbsp' when 'tablespoons' then 'tbsp'
    when 'teaspoon' then 'tsp' when 'teaspoons' then 'tsp'
    when 'cups' then 'cup' when 'can' then 'tin' when 'cans' then 'tin' when 'tins' then 'tin'
    when 'slices' then 'slice' when 'cloves' then 'clove' when 'bunches' then 'bunch'
    when 'packets' then 'packet' when 'pkg' then 'packet' when 'pack' then 'packet'
    when 'g 30.00' then 'g'
    else lower(trim(u)) end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 1. Zones, in the order you walk the kitchen (sort_order drives the Shop list order)
-- ---------------------------------------------------------------------------------------------
update grocery_categories set name = 'Fridge: Fruit & Veg' where name = 'Fresh Produce';
update grocery_categories set name = 'Pantry: Tins & Jars' where name = 'Pantry';

insert into grocery_categories (name)
select z from unnest(array[
  'Counter & Fruit Bowl', 'Pantry: Grains, Pasta & Cereal', 'Pantry: Baking',
  'Pantry: Oils, Vinegars & Sauces', 'Pantry: Nuts, Seeds & Dried Fruit', 'Pantry: Snacks'
]) z
where not exists (select 1 from grocery_categories c where c.name = z);

update grocery_categories c set sort_order = o.ord
from (values
  ('Counter & Fruit Bowl', 1), ('Fridge: Fruit & Veg', 2), ('Fridge', 3), ('Freezer', 4),
  ('Pantry: Tins & Jars', 5), ('Pantry: Grains, Pasta & Cereal', 6), ('Pantry: Baking', 7),
  ('Pantry: Oils, Vinegars & Sauces', 8), ('Pantry: Nuts, Seeds & Dried Fruit', 9),
  ('Pantry: Snacks', 10), ('Herbs & Spices', 11), ('Bread & Bakery', 12), ('Drinks', 13),
  ('Baby / Kids', 14), ('Cleaning & Home', 15), ('Toiletries', 16), ('Other', 17)
) as o(name, ord)
where c.name = o.name;

-- ---------------------------------------------------------------------------------------------
-- 2. Renames to SA / clearer names, then merge duplicates
-- ---------------------------------------------------------------------------------------------
update grocery_types set name = 'Onion' where name = 'White Onion';
update grocery_types set name = 'Cheddar' where name = 'Cheddar (Mature)';
update grocery_types set name = 'Cornflour (Maizena)' where name = 'Corn Starch';
update grocery_types set name = 'Prawns (Raw, Frozen)' where name = 'Uncooked Frozen Prawns';
update grocery_types set name = 'Raisins' where name = 'Raisins/Coconut (Optional)';

select pg_temp.merge_gt('White Onion', 'Onion');
select pg_temp.merge_gt('Brown Onion', 'Onion');
select pg_temp.merge_gt('Garlic Cloves', 'Garlic');
select pg_temp.merge_gt('Coleslaw', 'Coleslaw');                 -- two rows with the same name
select pg_temp.merge_gt('Pepper', 'Black Pepper');               -- every use is ground pepper (7.5 ml)
select pg_temp.merge_gt('Peas', 'Peas (Frozen)');
select pg_temp.merge_gt('Carrot (Grated)', 'Carrot');
select pg_temp.merge_gt('Grated Zucchini', 'Zucchini');
select pg_temp.merge_gt('Finely Chopped Spinach (Small Handful)', 'Baby Spinach');
select pg_temp.merge_gt('Freshly Grated Ginger', 'Ginger (Fresh)');
select pg_temp.merge_gt('Lettuce Packet', 'Lettuce');
select pg_temp.merge_gt('Orange Peels', 'Orange');
select pg_temp.merge_gt('Parsley', 'Parsley (Flat Leaf)');
select pg_temp.merge_gt('Roast Vegetables', 'Roasting Vegetables');
select pg_temp.merge_gt('Roasted Cherry Tomatoes', 'Cherry Tomatoes');
select pg_temp.merge_gt('Rocket', 'Wild Rocket');
select pg_temp.merge_gt('Unsweetened Coconut Milk', 'Coconut Milk');
select pg_temp.merge_gt('Cheese', 'Cheddar');
select pg_temp.merge_gt('Cheese (Grated)', 'Cheddar');
select pg_temp.merge_gt('Natural Yoghurt', 'Plain Yoghurt');
select pg_temp.merge_gt('Yoghurt', 'Plain Yoghurt');
select pg_temp.merge_gt('Egg Yolks', 'Eggs');
select pg_temp.merge_gt('Peanut/Sunflower Butter', 'Peanut Butter');
select pg_temp.merge_gt('Red Pepper Pesto Pasta Sauce', 'Red Pepper Pesto');
select pg_temp.merge_gt('Pasta Sauce', 'Tomato Pasta Sauce');
select pg_temp.merge_gt('Raw Shelled Prawns', 'Prawns (Raw, Frozen)');
select pg_temp.merge_gt('Pound Shrimp', 'Prawns (Raw, Frozen)'); -- an import mis-parse of "1 pound shrimp"
select pg_temp.merge_gt('Frozen Summer Berries', 'Frozen Berries');
select pg_temp.merge_gt('Mixed Berries', 'Frozen Berries');
select pg_temp.merge_gt('Berries', 'Frozen Berries');
select pg_temp.merge_gt('Mini Pizzas', 'Mini Cheese & Tomato Pizza');
select pg_temp.merge_gt('Pickles', 'Gherkins');
select pg_temp.merge_gt('Sweetcorn', 'Sweetcorn (Tinned)');
select pg_temp.merge_gt('Red Curry Paste', 'Thai Red Curry Paste');
select pg_temp.merge_gt('Mayo', 'Mayonnaise');
select pg_temp.merge_gt('Pasta Shells', 'Dried Mini Shell Pasta');
select pg_temp.merge_gt('Oats/Raisins (Sprinkle)', 'Oats');
select pg_temp.merge_gt('Almonds (Slivered)', 'Almonds (Flaked)');
select pg_temp.merge_gt('Dates', 'Medjool Dates');
select pg_temp.merge_gt('Flour', 'Cake Flour');                  -- SA "all-purpose" flour is cake flour
select pg_temp.merge_gt('All Purpose Flour', 'Cake Flour');
select pg_temp.merge_gt('Baking Soda', 'Bicarbonate of Soda');
select pg_temp.merge_gt('Sugar', 'Sugar (White)');
select pg_temp.merge_gt('Vanilla Extract', 'Vanilla Essence');
select pg_temp.merge_gt('Honey (Optional)', 'Honey');
select pg_temp.merge_gt('Red Pepper Flakes', 'Chilli Flakes');
select pg_temp.merge_gt('Tortilla Wraps', 'Tortillas');
select pg_temp.merge_gt('Wholewheat Wrap', 'Tortillas');
select pg_temp.merge_gt('Soda Stream Cylinder', 'Soda Stream Cylinder (model 60)');
select pg_temp.merge_gt('Black Bags', 'Bin Bags');

-- ---------------------------------------------------------------------------------------------
-- 3. Refile every food item into its zone (non-food zones are left as they were)
-- ---------------------------------------------------------------------------------------------
select pg_temp.zone('Counter & Fruit Bowl', array[
  'Apple', 'Avocado', 'Banana', 'Butternut', 'Exotic Tomatoes', 'Fruit', 'Garlic', 'Ginger (Fresh)',
  'Lemons', 'Limes', 'Mango', 'Onion', 'Orange', 'Peaches (Fresh)', 'Potatoes', 'Pumpkin',
  'Red Onion', 'Shallot', 'Sweet Potatoes', 'Watermelon']);

select pg_temp.zone('Fridge: Fruit & Veg', array[
  'Asparagus', 'Baby Butter Lettuce', 'Baby Spinach', 'Basil', 'Beetroot', 'Bell Pepper', 'Blueberries',
  'Brinjal (Large)', 'Broccoli', 'Cabbage', 'Carrot', 'Cauliflower', 'Celery Stalks', 'Cherry Tomatoes',
  'Coleslaw', 'Coriander', 'Corn', 'Crunchita® Lettuce', 'Cucumber', 'Dill (Fresh)', 'Fresh Fennel',
  'Grapes (White)', 'Green Chilli', 'Green Pepper', 'Jalapeño', 'Kale', 'Leeks', 'Lemongrass Stalks',
  'Lettuce', 'Mange Tout', 'Mint', 'Mushrooms', 'Mushrooms (Large)', 'Parsley (Flat Leaf)',
  'Rainbow Slaw', 'Red Chilli', 'Red Pepper', 'Roast Potatoes', 'Roasting Vegetables',
  'Rosemary (Fresh)', 'Snap Peas', 'Spring Onions', 'Tenderstem Broccoli', 'Thyme (Fresh)',
  'Wild Rocket', 'Zucchini']);

select pg_temp.zone('Fridge', array[
  'Almond Milk', 'Bacon', 'Basil Pesto', 'Beef Lasagne', 'Beef Mince', 'Beef Sirloin Steak',
  'Bocconcini Mozzarella', 'Boerewors', 'Boursin Cheese', 'Brie', 'Burrata Cheese', 'Butter',
  'Camembert', 'Cheddar', 'Cheesy Veg Microwave Tray', 'Chicken', 'Chicken Broth', 'Chipolatas',
  'Cottage Cheese', 'Cream (Double Thick)', 'Cream Cheese', 'Crème Fraîche',
  'Double Cream Ayrshire Coconut Yoghurt', 'Eggs', 'Emmental Cheese', 'Feta',
  'Fresh Pumpkin & Ginger Soup', 'Garlic Bread', 'Gnocchi (Fresh)', 'Goat’s Cheese', 'Halloumi',
  'Hummus', 'Lamb Chops', 'Large Quiche', 'Mascarpone Cheese', 'Meatballs', 'Melanzane Parmigiana',
  'Milk', 'Miso Paste', 'Mozzarella', 'Olives', 'Olives (Green/Queen)', 'Parmesan', 'Pasta Parcels',
  'Pickled Red Onion', 'Plain Yoghurt', 'Pre-Made Mash and Stew', 'Pre-Made Meals: Chicken Lasagne',
  'Pre-Made Spaghetti', 'Sour Cream', 'Steak', 'Unsalted Butter', 'Veg Quiche (Spinach & Feta) Mini',
  'Veggie Frittatas', 'White Rock Cheese (Fig)', 'Woolies Chicken and Broccoli Bake',
  'Woolies Chicken Breasts with Risotto', 'Woolies Pie', 'Woolies Rotisserie Chicken',
  'Woolies Spinach and Butternut', 'Slow Cooked Aubergine and Coconut Curry']);

select pg_temp.zone('Freezer', array[
  'Chicken Strips', 'Cooked Prawns', 'Corn (Frozen)', 'Fish Cakes', 'Fish Fingers', 'Frozen Berries',
  'Frozen Strawberries', 'Frozen Sweet Potato Chips', 'Hake', 'Hamburgers', 'Kids Butter Chicken Meal',
  'Kids Pasta Pillows Meal', 'Mini Cheese & Tomato Pizza', 'Mixed Vegetables', 'Parathas',
  'Peas (Frozen)', 'Peas & Corn (Frozen)', 'Prawns (Raw, Frozen)', 'Pre-Made Meals: Bobotie',
  'Pre-Made Meals: Spaghetti Bolognaise', 'Puff Pastry', 'Quiche Lorraine (Minis)',
  'Roasted Butternut & Spinach Phyllo Parcel']);

select pg_temp.zone('Pantry: Tins & Jars', array[
  'Almond Butter', 'Anchovy Fillets', 'Artichokes', 'Black Beans', 'Butter Beans', 'Cannellini Beans',
  'Capers', 'Chickpeas', 'Coconut Milk', 'Diced Tomatoes', 'Gherkins', 'Passata', 'Peanut Butter',
  'Red Kidney Beans', 'Red Pepper Pesto', 'Salsa', 'Sweetcorn (Tinned)', 'Tahini', 'Thai Red Curry Paste',
  'Tomato Pasta Sauce', 'Tomato Paste', 'Vegetable Stock', 'Whole Unpeeled Cherry Tomatoes (Tinned)']);

select pg_temp.zone('Pantry: Grains, Pasta & Cereal', array[
  'Brown Lentils', 'Carb Clever Cereal', 'Couscous', 'Dried Mini Shell Pasta', 'Jasmine Rice', 'Oats',
  'Orzo', 'Pasta (Linguine)', 'Pasta (Macaroni)', 'Pasta (Penne)', 'Pasta (Spaghetti)',
  'Pasta (Tagliatelle)', 'Pasta Rice', 'Quinoa', 'Red Lentils', 'Rice', 'Rigatoni', 'Weetbix']);

select pg_temp.zone('Pantry: Baking', array[
  'Almond Flour', 'Baking Powder', 'Bicarbonate of Soda', 'Brown Rice Flour', 'Brown Sugar',
  'Buckwheat Flour', 'Cacao Powder', 'Cake Flour', 'Chickpea Flour', 'Chocolate',
  'Chocolate (Lindt 78%)', 'Chocolate (Lindt 85%)', 'Cocoa Powder', 'Cornflour (Maizena)',
  'Gelatin (or Agar Agar)', 'Honey', 'Ice-cream Cones', 'Ladyfinger Biscuits (Hard)', 'Maple Syrup',
  'Oat Flour', 'Self Raising Flour', 'Sugar (Coconut)', 'Sugar (White)', 'Vanilla Essence',
  'Vanilla Paste']);

select pg_temp.zone('Pantry: Oils, Vinegars & Sauces', array[
  'Avocado Oil', 'Balsamic Vinegar', 'Coconut Oil', 'Fish Sauce', 'Hot Sauce', 'Lemon Juice',
  'Low Sodium Soy Sauce', 'Mayonnaise', 'Mustard (Dijon)', 'Olive Oil', 'Red Wine Vinegar',
  'Rice Vinegar', 'Sesame Oil', 'Soy Sauce', 'Sriracha', 'Sriracha Mayo', 'Tomato Sauce',
  'Vegetable Oil', 'White Vinegar']);

select pg_temp.zone('Pantry: Nuts, Seeds & Dried Fruit', array[
  'Almonds (Flaked)', 'Almonds (Raw)', 'Cashews', 'Cashews (Salted)', 'Chia Seeds', 'Coconut Flakes',
  'Cranberries', 'Desiccated Coconut', 'Flaxseed', 'Hemp Seeds', 'Macadamia Nuts', 'Medjool Dates',
  'Peanuts', 'Pecan Nuts', 'Pine Nuts', 'Pistachio Nuts', 'Pumpkin Seeds', 'Raisins',
  'Sesame Seeds', 'Shredded Unsweetened Coconut', 'Sunflower Seeds', 'Walnuts']);

select pg_temp.zone('Pantry: Snacks', array[
  'Crisps', 'Croutons', 'Oaties', 'Popped Cracker Cakes', 'Rosemary Crackers', 'Tortilla Chips']);

select pg_temp.zone('Herbs & Spices', array[
  'Bay Leaves', 'Black Pepper', 'Cardamom (Ground)', 'Chilli Flakes', 'Chilli Powder', 'Chipotle Spice',
  'Cinnamon', 'Coriander (Ground)', 'Cumin (Ground)', 'Cumin Seeds', 'Curry Powder', 'Fennel Seeds',
  'Garam Masala', 'Garlic Powder', 'Nutmeg (Ground)', 'Nutritional Yeast', 'Oregano (Dried)', 'Paprika',
  'Salt', 'Smoked Paprika', 'Turmeric', 'White Pepper']);

select pg_temp.zone('Other', array['Underwear']);

-- ---------------------------------------------------------------------------------------------
-- 4. Units → canonical spellings, everywhere a quantity lives
-- ---------------------------------------------------------------------------------------------
update recipe_ingredients set quantity = round(quantity * 10 / 15, 2), unit = 'tbsp'
  where lower(unit) in ('dessertspoon', 'dessertspoons');                -- 10 ml → 15 ml spoons
update recipe_ingredients  set unit = pg_temp.unit(unit) where unit is distinct from pg_temp.unit(unit);
update shopping_list_items set unit = pg_temp.unit(unit) where unit is distinct from pg_temp.unit(unit);
update grocery_list_items  set unit = pg_temp.unit(unit) where unit is distinct from pg_temp.unit(unit);
update meal_plan_entries   set unit = pg_temp.unit(unit) where unit is not null and unit is distinct from pg_temp.unit(unit);
alter table recipe_ingredients  alter column unit set default 'item';
alter table grocery_list_items  alter column unit set default 'item';

-- ---------------------------------------------------------------------------------------------
-- 5. Ready-meal "recipes" → Items; Leftovers → Note; Test Recipe archived
-- ---------------------------------------------------------------------------------------------
insert into grocery_types (name, category_id)
select 'Garlic Bread', (select id from grocery_categories where name = 'Fridge')
where not exists (select 1 from grocery_types where name = 'Garlic Bread');

do $$
declare m record;
begin
  for m in select * from (values
    ('Kids Butter Chicken Meal', 'Kids Butter Chicken Meal'),
    ('Pasta Pillows', 'Kids Pasta Pillows Meal'),
    ('Garlic Bread', 'Garlic Bread'),
    ('Woolies Spinach and Butternut', 'Woolies Spinach and Butternut'),
    ('Beef Lasagne', 'Beef Lasagne'),
    ('Woolies Pie', 'Woolies Pie')
  ) as t(recipe_name, item_name) loop
    update meal_plan_entries e
       set entry_type = 'Item',
           item_grocery_type_id = (select id from grocery_types where name = m.item_name limit 1),
           quantity = 1, unit = 'item', servings = null, recipe_id = null
     where e.recipe_id in (select id from recipes where name = m.recipe_name and not is_archived);
    update recipes set is_archived = true where name = m.recipe_name;
  end loop;
end $$;

update meal_plan_entries
   set entry_type = 'Note', note_text = 'Leftovers', recipe_id = null, servings = null
 where recipe_id in (select id from recipes where name = 'Leftovers');
update recipes set is_archived = true where name in ('Leftovers', 'Test Recipe');
