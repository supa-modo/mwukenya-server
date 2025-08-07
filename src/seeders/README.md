# Database Seeders

This directory contains database seeders for initializing the MWU Kenya Digital Platform with default test data.

## Available Seeders

### 1. User Seeder (`userSeeder.ts`)

Creates default users for testing:

- **Super Admin**: `admin@mwukenya.co.ke` (Super Admin role)
- **Admin**: `system@mwukenya.co.ke` (Admin role)
- **Coordinators**: 2 coordinators with different counties
- **Delegates**: 3 delegates assigned to coordinators
- **Members**: 5 active members assigned to delegates
- **Pending Members**: 2 pending members for testing

### 2. Medical Scheme Seeder (`medicalSchemeSeeder.ts`)

Creates default medical schemes:

- **Basic Medical Cover** (M) - KES 50/day
- **Family Medical Cover** (M+1) - KES 80/day
- **Extended Family Cover** (M+2) - KES 100/day
- **Premium Family Cover** (M+3) - KES 120/day
- **Comprehensive Family Cover** (M+4) - KES 140/day
- **Ultimate Family Cover** (M+5) - KES 160/day

## Usage

### Run All Seeders

```bash
npm run db:seed
```

### Run Individual Seeders

```bash
# Run only user seeder
npm run db:seed:users

# Run only medical scheme seeder
npm run db:seed:schemes
```

### Manual Execution

```bash
# Run all seeders
npx ts-node -r tsconfig-paths/register src/seeders/index.ts

# Run user seeder only
npx ts-node -r tsconfig-paths/register src/seeders/userSeeder.ts

# Run medical scheme seeder only
npx ts-node -r tsconfig-paths/register src/seeders/medicalSchemeSeeder.ts
```

## Default Credentials

All users are created with the default password: **`Password123!`**

### Key Test Users

| Role          | Email                         | Phone           | ID Number  |
| ------------- | ----------------------------- | --------------- | ---------- |
| Super Admin   | `admin@mwukenya.co.ke`        | `+254700000001` | `12345678` |
| Admin         | `system@mwukenya.co.ke`       | `+254700000002` | `12345679` |
| Coordinator 1 | `coordinator1@mwukenya.co.ke` | `+254700000003` | `12345680` |
| Coordinator 2 | `coordinator2@mwukenya.co.ke` | `+254700000004` | `12345681` |
| Delegate 1    | `delegate1@mwukenya.co.ke`    | `+254700000005` | `12345682` |
| Delegate 2    | `delegate2@mwukenya.co.ke`    | `+254700000006` | `12345683` |
| Delegate 3    | `delegate3@mwukenya.co.ke`    | `+254700000007` | `12345684` |

## Features

- **Idempotent**: Seeders check if data already exists before creating new records
- **Transactional**: All operations are wrapped in database transactions
- **Comprehensive**: Creates a complete hierarchy of users (Admin → Coordinators → Delegates → Members)
- **Realistic Data**: Uses realistic Kenyan phone numbers, counties, and SACCO names
- **Test Ready**: Includes both active and pending members for testing different scenarios

## Notes

- Seeders will skip creation if data already exists
- All users are created with verified email, phone, and ID number status
- Medical schemes include comprehensive benefit structures
- User hierarchy is properly established with correct relationships
- All timestamps are set to current date/time
