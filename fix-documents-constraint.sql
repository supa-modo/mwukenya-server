-- Fix Documents Table Foreign Key Constraint
-- Run this script in your production database

-- Step 1: Drop the problematic foreign key constraint
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;

-- Step 2: Add foreign key constraint to users table
ALTER TABLE documents 
ADD CONSTRAINT documents_entity_id_users_fkey 
FOREIGN KEY (entity_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Step 3: Add foreign key constraint to dependants table (if needed)
ALTER TABLE documents 
ADD CONSTRAINT documents_entity_id_dependants_fkey 
FOREIGN KEY (entity_id) 
REFERENCES dependants(id) 
ON DELETE CASCADE;

-- Step 4: Add check constraint to ensure entity_type matches the referenced table
ALTER TABLE documents 
ADD CONSTRAINT documents_entity_type_check 
CHECK (
  (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
  (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
);

-- Step 5: Verify the constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'documents';
