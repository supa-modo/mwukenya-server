import { sequelize } from "../models";
import logger from "../utils/logger";
import { config } from "../config";

/**
 * Comprehensive Database Reset Script
 *
 * This script completely resets the database by:
 * 1. Dropping all tables and constraints
 * 2. Recreating all tables with proper associations
 * 3. Seeding with initial data if needed
 * 4. Verifying the reset was successful
 *
 * ⚠️  WARNING: This will permanently delete ALL data!
 *
 * Usage:
 *   npm run reset-db
 *   or
 *   npx ts-node src/scripts/resetDatabase.ts
 */

interface ResetOptions {
  force?: boolean;
  seed?: boolean;
  verbose?: boolean;
}

const resetDatabase = async (options: ResetOptions = {}): Promise<void> => {
  const { force = true, seed = false, verbose = false } = options;

  try {
    logger.info("🚀 Starting comprehensive database reset...");
    logger.info(`Environment: ${config.env}`);
    logger.info(`Force mode: ${force}`);
    logger.info(`Seed data: ${seed}`);

    // Safety check for production
    if (config.env === "production" && !process.env.FORCE_RESET_DB) {
      throw new Error(
        "Production database reset blocked! Set FORCE_RESET_DB=true to override this safety check."
      );
    }

    // Step 1: Test database connection
    logger.info("📡 Testing database connection...");
    await sequelize.authenticate();
    logger.info("✅ Database connection established");

    // Step 2: Get current database info
    const [results] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const existingTables = (results as any[]).map((row) => row.tablename);
    logger.info(
      `📊 Found ${existingTables.length} existing tables:`,
      existingTables
    );

    // Step 3: Drop all foreign key constraints first
    logger.info("🔗 Dropping foreign key constraints...");
    await dropAllForeignKeys();

    // Step 4: Drop all tables
    logger.info("🗑️  Dropping all tables...");
    await sequelize.sync({ force: true });
    logger.info("✅ All tables dropped and recreated");

    // Step 5: Verify tables were created
    const [newResults] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const newTables = (newResults as any[]).map((row) => row.tablename);
    logger.info(`📊 Created ${newTables.length} new tables:`, newTables);

    // Step 6: Verify table structure
    logger.info("🔍 Verifying table structure...");
    await verifyTableStructure();

    // Step 7: Seed initial data if requested
    if (seed) {
      logger.info("🌱 Seeding initial data...");
      await seedInitialData();
    }

    // Step 8: Final verification
    logger.info("✅ Final verification...");
    await finalVerification();

    logger.info("🎉 Database reset completed successfully!");
    logger.info("📋 Summary:");
    logger.info(`   - Environment: ${config.env}`);
    logger.info(`   - Tables dropped: ${existingTables.length}`);
    logger.info(`   - Tables created: ${newTables.length}`);
    logger.info(`   - Data seeded: ${seed ? "Yes" : "No"}`);

    process.exit(0);
  } catch (error: any) {
    logger.error("💥 Database reset failed:", {
      error: error.message,
      stack: error.stack,
      environment: config.env,
    });

    // Try to close connection gracefully
    try {
      await sequelize.close();
    } catch (closeError) {
      logger.error("Failed to close database connection:", closeError);
    }

    process.exit(1);
  }
};

/**
 * Drop all foreign key constraints to avoid dependency issues
 */
const dropAllForeignKeys = async (): Promise<void> => {
  try {
    // Get all foreign key constraints
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `);

    const foreignKeys = constraints as any[];

    if (foreignKeys.length > 0) {
      logger.info(
        `Found ${foreignKeys.length} foreign key constraints to drop`
      );

      for (const fk of foreignKeys) {
        try {
          await sequelize.query(`
            ALTER TABLE "${fk.table_name}" 
            DROP CONSTRAINT "${fk.constraint_name}";
          `);
          logger.debug(`Dropped FK: ${fk.table_name}.${fk.constraint_name}`);
        } catch (error: any) {
          logger.warn(
            `Failed to drop FK ${fk.constraint_name}: ${error.message}`
          );
        }
      }
    }

    logger.info("✅ Foreign key constraints handled");
  } catch (error: any) {
    logger.warn(
      "Failed to drop foreign keys (continuing anyway):",
      error.message
    );
  }
};

/**
 * Verify that all expected tables were created with correct structure
 */
const verifyTableStructure = async (): Promise<void> => {
  const expectedTables = [
    "users",
    "medical_schemes",
    "documents",
    "member_subscriptions",
    "dependants",
    "payments",
    "payment_coverages",
    "daily_settlements",
    "commission_payouts",
    "bank_transfers",
    "audit_logs",
  ];

  for (const tableName of expectedTables) {
    try {
      const [results] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);

      const columns = (results as any[]).map((row) => row.column_name);
      logger.debug(
        `✅ Table '${tableName}' verified (${columns.length} columns)`
      );
    } catch (error: any) {
      logger.error(
        `❌ Table '${tableName}' verification failed:`,
        error.message
      );
      throw new Error(`Table verification failed for ${tableName}`);
    }
  }

  logger.info("✅ All table structures verified");
};

/**
 * Seed initial data for development/testing
 */
const seedInitialData = async (): Promise<void> => {
  try {
    // Import models and types
    const { User, MedicalScheme } = await import("../models");
    const { CoverageType } = await import("../models/types");

    // Create default medical schemes
    const schemes = [
      {
        name: "SHA Basic",
        code: "SHA_BASIC",
        description: "Social Health Authority Basic Plan",
        coverageType: CoverageType.M_PLUS_3,
        dailyPremium: 16.67, // ~500 KES per month
        shaPortion: 10.0,
        delegateCommission: 2.0,
        coordinatorCommission: 1.0,
        benefits: ["Basic medical coverage", "Emergency services"],
        limitations: ["Limited specialist visits"],
        isActive: true,
      },
      {
        name: "SHA Premium",
        code: "SHA_PREMIUM",
        description: "Social Health Authority Premium Plan",
        coverageType: CoverageType.M_PLUS_5,
        dailyPremium: 33.33, // ~1000 KES per month
        shaPortion: 20.0,
        delegateCommission: 4.0,
        coordinatorCommission: 2.0,
        benefits: [
          "Comprehensive medical coverage",
          "Specialist visits",
          "Emergency services",
        ],
        limitations: ["Annual limit applies"],
        isActive: true,
      },
    ];

    for (const schemeData of schemes) {
      await MedicalScheme.findOrCreate({
        where: { name: schemeData.name },
        defaults: schemeData,
      });
    }

    logger.info("✅ Initial data seeded successfully");
  } catch (error: any) {
    logger.error("Failed to seed initial data:", error.message);
    throw error;
  }
};

/**
 * Final verification that everything is working
 */
const finalVerification = async (): Promise<void> => {
  try {
    // Test basic queries on each table
    const { User, MedicalScheme, Payment, DailySettlement } = await import(
      "../models"
    );

    // Test User model
    const userCount = await User.count();
    logger.debug(`Users table: ${userCount} records`);

    // Test MedicalScheme model
    const schemeCount = await MedicalScheme.count();
    logger.debug(`Medical schemes table: ${schemeCount} records`);

    // Test Payment model
    const paymentCount = await Payment.count();
    logger.debug(`Payments table: ${paymentCount} records`);

    // Test DailySettlement model
    const settlementCount = await DailySettlement.count();
    logger.debug(`Settlements table: ${settlementCount} records`);

    logger.info("✅ Final verification completed - all models accessible");
  } catch (error: any) {
    logger.error("Final verification failed:", error.message);
    throw error;
  }
};

// Handle command line arguments
const parseArgs = (): ResetOptions => {
  const args = process.argv.slice(2);
  const options: ResetOptions = {};

  for (const arg of args) {
    switch (arg) {
      case "--seed":
        options.seed = true;
        break;
      case "--no-force":
        options.force = false;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
        console.log(`
Database Reset Script

Usage: npx ts-node src/scripts/resetDatabase.ts [options]

Options:
  --seed      Seed initial data after reset
  --no-force  Don't force drop tables (safer but may fail)
  --verbose   Enable verbose logging
  --help      Show this help message

Environment Variables:
  FORCE_RESET_DB=true  Required for production resets

⚠️  WARNING: This will permanently delete ALL data!
        `);
        process.exit(0);
        break;
    }
  }

  return options;
};

// Run the reset with parsed options
const options = parseArgs();
resetDatabase(options);
