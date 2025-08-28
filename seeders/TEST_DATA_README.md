# Test Data Seeder

This seeder creates test data specifically designed for testing table pagination and data display functionality.

## What It Creates

The test data seeder creates a hierarchical structure of users:

```
1 Test Coordinator
└── 1 Test Delegate
    ├── 25 Active Members
    ├── 2 Pending Members
    └── 2 Inactive Members
```

**Total: 31 test users**

## Test Data Details

### Coordinator

- **Email**: `test.coordinator@mwukenya.co.ke`
- **Phone**: `+254700000100`
- **ID Number**: `TEST001`
- **Role**: `COORDINATOR`

### Delegate

- **Email**: `test.delegate@mwukenya.co.ke`
- **Phone**: `+254700000101`
- **ID Number**: `TEST002`
- **Role**: `DELEGATE`
- **Reports to**: Test Coordinator

### Members

- **25 Active Members**: `test.member1@example.com` to `test.member25@example.com`
- **2 Pending Members**: `pending.test1@example.com`, `pending.test2@example.com`
- **2 Inactive Members**: `inactive.test1@example.com`, `inactive.test2@example.com`

All members are assigned to the test delegate and coordinator.

## Usage

### Option 1: Run via npm script (Recommended)

```bash
npm run db:seed:test
```

### Option 2: Run directly with ts-node

```bash
npx ts-node -r tsconfig-paths/register src/seeders/testDataSeeder.ts
```

### Option 3: Run the compiled JavaScript

```bash
node scripts/seed-test-data.cjs
```

### Option 4: Include in main seeding process

The test data seeder is automatically included when running the main seeder in development/test mode:

```bash
npm run db:seed
```

## Default Credentials

**Password for all test users**: `Password123!`

## Perfect For Testing

This seeder is ideal for testing:

- **Table pagination** - 25+ records to test pagination controls
- **Data filtering** - Different counties, saccos, routes, and statuses
- **Search functionality** - Various names and email patterns
- **Bulk operations** - Multiple records for testing bulk actions
- **Performance** - Test how your UI handles multiple records
- **Responsive design** - Verify tables work well with many rows

## Data Variations

The test data includes:

- **Counties**: Nairobi, Mombasa, Kisumu, Nakuru, Eldoret
- **Saccos**: Test Sacco A, Test Sacco B, Test Sacco C
- **Routes**: Route 1, Route 2, Route 3, Route 4, Route 5
- **Statuses**: Active, Pending, Inactive
- **Genders**: Alternating male/female
- **Membership dates**: Random dates within the last year

## Cleanup

To remove test data, you can:

1. Reset the entire database: `npm run db:reset`
2. Manually delete test users via the admin interface
3. Create a cleanup script (future enhancement)

## Notes

- Test data is only created in development/test environments
- All test users have verified email, phone, and ID numbers (except pending members)
- Test data uses unique email addresses and ID numbers to avoid conflicts
- The seeder is idempotent and can be run multiple times safely
