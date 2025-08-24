# Documents Table Foreign Key Constraint Fix Guide

## Problem Description

You're encountering this error when uploading documents in production:

```
insert or update on table "documents" violates foreign key constraint "documents_entity_id_fkey"
Key (entity_id)=(d4e4841b-2939-43a9-b1f5-13f80cc51a85) is not present in table "dependants".
```

## Root Cause

The production database has an incorrect foreign key constraint `documents_entity_id_fkey` that's pointing to the `dependants` table instead of allowing references to both `users` and `dependants` tables based on the `entity_type` field.

## Solution Options

### Option 1: Run the SQL Script (Recommended)

1. Connect to your production database
2. Run the SQL script: `fix-documents-constraint.sql`

```bash
# Connect to your database
psql -h your_host -U your_username -d your_database

# Run the script
\i fix-documents-constraint.sql
```

### Option 2: Run the Node.js Script

1. Update the database configuration in `fix-documents-constraint-production.js`
2. Run the script:

```bash
cd mwuKenya/server
node fix-documents-constraint-production.js
```

### Option 3: Manual Database Fix

If the above options don't work, manually fix the constraint:

```sql
-- 1. Drop the problematic constraint
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_entity_id_fkey;

-- 2. Add constraint to users table
ALTER TABLE documents
ADD CONSTRAINT documents_entity_id_users_fkey
FOREIGN KEY (entity_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 3. Add constraint to dependants table
ALTER TABLE documents
ADD CONSTRAINT documents_entity_id_dependants_fkey
FOREIGN KEY (entity_id)
REFERENCES dependants(id)
ON DELETE CASCADE;

-- 4. Add check constraint
ALTER TABLE documents
ADD CONSTRAINT documents_entity_type_check
CHECK (
  (entity_type = 'user' AND entity_id IN (SELECT id FROM users)) OR
  (entity_type = 'dependant' AND entity_id IN (SELECT id FROM dependants))
);
```

## Verification

After applying the fix, verify the constraints:

```sql
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
```

You should see:

- `documents_entity_id_users_fkey` → `users.id`
- `documents_entity_id_dependants_fkey` → `dependants.id`

## Why This Happened

1. **Schema Mismatch**: The production database was created with a different schema than what your current code expects
2. **Polymorphic Relationship**: Your Document model supports both user and dependant documents, but the database constraint was incorrectly set up
3. **Migration Issues**: The production database may have been created from an older version of your schema

## Prevention

1. **Always use migrations** for schema changes
2. **Test migrations** in a staging environment first
3. **Keep development and production schemas in sync**
4. **Use database versioning** tools

## After the Fix

Once the constraint is fixed:

1. Restart your application
2. Try uploading a document again
3. The upload should work without foreign key constraint errors

## Troubleshooting

If you still get errors:

1. **Check database logs** for more details
2. **Verify the user exists** in the users table
3. **Check if the dependants table exists** and has the correct structure
4. **Ensure your application has proper database permissions**

## Support

If you continue to have issues:

1. Check the database logs
2. Verify the constraint was properly applied
3. Ensure your application can connect to the database
4. Check if there are any other foreign key constraints causing issues
