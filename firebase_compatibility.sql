-- ⚠️ IMPORTANT: Run this to allow Firebase Users (Text UIDs) in Supabase Tables

-- 1. Modify User Carts Table
ALTER TABLE user_carts 
DROP CONSTRAINT user_carts_userId_fkey; -- Drop the foreign key to auth.users

ALTER TABLE user_carts 
ALTER COLUMN "userId" TYPE TEXT; -- Change UUID to TEXT to accept Firebase IDs

-- 2. Modify Orders Table
ALTER TABLE orders 
DROP CONSTRAINT orders_userId_fkey; -- Drop the foreign key to auth.users

ALTER TABLE orders 
ALTER COLUMN "userId" TYPE TEXT; -- Change UUID to TEXT
