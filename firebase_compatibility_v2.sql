-- ⚠️ IMPORTANT: Run this one if "CONSTRAINT does not exist" error occurs

-- 1. Modify User Carts Table (Force Type Change)
ALTER TABLE user_carts 
ALTER COLUMN "userId" TYPE TEXT; -- Change UUID to TEXT to accept Firebase IDs

-- 2. Modify Orders Table (Force Type Change)
ALTER TABLE orders 
ALTER COLUMN "userId" TYPE TEXT; -- Change UUID to TEXT

-- Note: We are not dropping constraints explicitly because they might not exist
-- or are named differently. Changing the column type usually drops the FK automatically if strict.
