# Database Reset Script Documentation

## 🚀 Overview

The `resetDatabase.ts` script provides a comprehensive way to completely reset your database from scratch. It handles all the complexities of dropping tables, constraints, and recreating everything with proper associations.

## ⚠️ Important Warnings

- **This will permanently delete ALL data in your database!**
- **Production safety**: Requires `FORCE_RESET_DB=true` environment variable for production resets
- **Backup recommended**: Always backup your data before running this script

## 📋 What the Script Does

### 1. **Safety Checks**

- Verifies database connection
- Blocks production resets without explicit permission
- Validates environment configuration

### 2. **Complete Reset Process**

- Drops all foreign key constraints first (avoids dependency issues)
- Drops all existing tables
- Recreates all tables with proper associations
- Verifies table structure and relationships

### 3. **Verification & Validation**

- Confirms all expected tables were created
- Validates table structure and columns
- Tests model accessibility
- Provides detailed logging throughout

### 4. **Optional Seeding**

- Can seed initial data (medical schemes, etc.)
- Useful for development/testing environments

## 🛠️ Usage Options

### Basic Reset (No Data Seeding)

```bash
npm run db:reset
# or
npx ts-node src/scripts/resetDatabase.ts
```

### Reset with Initial Data Seeding

```bash
npm run db:reset:seed
# or
npx ts-node src/scripts/resetDatabase.ts --seed
```

### Verbose Reset (More Detailed Logging)

```bash
npm run db:reset:force
# or
npx ts-node src/scripts/resetDatabase.ts --verbose
```

### Show Help

```bash
npm run db:reset:help
# or
npx ts-node src/scripts/resetDatabase.ts --help
```

## 🔧 Command Line Options

| Option       | Description                                  |
| ------------ | -------------------------------------------- |
| `--seed`     | Seed initial data after reset                |
| `--no-force` | Don't force drop tables (safer but may fail) |
| `--verbose`  | Enable verbose logging                       |
| `--help`     | Show help message                            |

## 🌍 Environment Variables

| Variable         | Description                          | Required        |
| ---------------- | ------------------------------------ | --------------- |
| `FORCE_RESET_DB` | Set to `true` for production resets  | Production only |
| `NODE_ENV`       | Environment (development/production) | Yes             |
| `DATABASE_URL`   | Database connection string           | Yes             |

## 📊 Expected Tables

The script creates and verifies these tables:

- `users` - User accounts and profiles
- `medical_schemes` - Medical insurance schemes
- `documents` - User documents and verification
- `member_subscriptions` - User subscriptions to schemes
- `dependants` - User dependants
- `payments` - Payment transactions
- `payment_coverages` - Payment coverage details
- `daily_settlements` - Daily settlement records
- `commission_payouts` - Commission payout records
- `bank_transfers` - Bank transfer records
- `audit_logs` - System audit logs

## 🔍 Verification Process

### 1. **Connection Test**

- Tests database connectivity
- Logs connection details

### 2. **Pre-Reset Analysis**

- Lists existing tables
- Identifies foreign key constraints

### 3. **Constraint Handling**

- Drops foreign key constraints safely
- Handles constraint dependencies

### 4. **Table Recreation**

- Drops all tables
- Recreates with proper associations
- Verifies table structure

### 5. **Post-Reset Verification**

- Confirms all tables exist
- Tests model accessibility
- Validates relationships

## 🌱 Seeding Process

When using `--seed` option, the script creates:

### Medical Schemes

- **SHA Basic**: 500 KES/month, 100,000 KES coverage
- **SHA Premium**: 1,000 KES/month, 500,000 KES coverage

## 📝 Logging Output

The script provides detailed logging with emojis for easy reading:

```
🚀 Starting comprehensive database reset...
📡 Testing database connection...
✅ Database connection established
📊 Found 11 existing tables: [users, medical_schemes, ...]
🔗 Dropping foreign key constraints...
✅ Foreign key constraints handled
🗑️  Dropping all tables...
✅ All tables dropped and recreated
📊 Created 11 new tables: [users, medical_schemes, ...]
🔍 Verifying table structure...
✅ All table structures verified
🌱 Seeding initial data...
✅ Initial data seeded successfully
✅ Final verification...
✅ Final verification completed - all models accessible
🎉 Database reset completed successfully!
```

## 🚨 Error Handling

The script includes comprehensive error handling:

- **Connection failures**: Clear error messages with connection details
- **Constraint issues**: Graceful handling of foreign key problems
- **Table verification**: Detailed error reporting for missing tables
- **Graceful shutdown**: Properly closes database connections on failure

## 🔒 Production Safety

For production environments:

1. **Explicit permission required**: Must set `FORCE_RESET_DB=true`
2. **Environment validation**: Checks for production environment
3. **Detailed logging**: All actions are logged for audit trails
4. **Graceful failure**: Proper error handling and connection cleanup

## 🧪 Development Usage

Perfect for development environments:

- Quick database resets during development
- Consistent starting state for testing
- Easy cleanup of test data
- Optional seeding for immediate testing

## 📚 Related Scripts

- `npm run db:migrate` - Sync database without dropping data
- `npm run db:seed` - Seed data without resetting
- `npm run db:seed:users` - Seed user data only
- `npm run db:seed:schemes` - Seed medical schemes only

## 🆘 Troubleshooting

### Common Issues

1. **"Production database reset blocked"**

   - Set `FORCE_RESET_DB=true` environment variable

2. **"Table verification failed"**

   - Check database permissions
   - Verify model definitions

3. **"Foreign key constraint errors"**

   - The script handles this automatically
   - Check logs for specific constraint issues

4. **"Connection failed"**
   - Verify database credentials
   - Check network connectivity
   - Ensure database server is running

### Getting Help

Run the help command for detailed usage information:

```bash
npm run db:reset:help
```

## 🔄 Workflow Integration

### Development Workflow

```bash
# Reset database for clean development state
npm run db:reset:seed

# Start development server
npm run dev
```

### Testing Workflow

```bash
# Reset to clean state before tests
npm run db:reset

# Run tests
npm test

# Reset again if needed
npm run db:reset:seed
```

### Production Deployment

```bash
# Set production flag
export FORCE_RESET_DB=true

# Reset production database (use with extreme caution!)
npm run db:reset:seed
```

---

**Remember**: This script is designed for development and testing. Use with extreme caution in production environments!
